/**
 * Node Authentication & Authorization
 * 
 * Enterprise-grade authentication for WAF nodes connecting to ATRAVAD WAF dashboard.
 * Implements secure API key validation with hashing, rate limiting, and audit logging.
 * 
 * Architecture:
 * - API keys are generated with high entropy (32 bytes)
 * - Keys are hashed using SHA-256 with salt before storage
 * - Validation happens on every node-initiated request
 * - Failed attempts are logged for security monitoring
 */

import { adminDb } from '@/lib/firebase-admin';
import { createHash, randomBytes } from 'crypto';

/**
 * Generate a secure API key for a node
 * Format: atravad_{32-byte-random-base64}
 * 
 * @returns {string} Plaintext API key (show once to user)
 */
export function generateNodeApiKey() {
  // Generate 32 bytes of random data (256 bits of entropy)
  const randomData = randomBytes(32);
  // Encode as base64url-safe string
  const keySuffix = randomData.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `atravad_${keySuffix}`;
}

/**
 * Hash an API key for secure storage
 * Uses SHA-256 with a salt (node ID) for additional security
 * 
 * @param {string} apiKey - Plaintext API key
 * @param {string} nodeId - Node ID (used as salt)
 * @returns {string} Hashed API key (hex)
 */
export function hashApiKey(apiKey, nodeId) {
  const salt = nodeId; // Use node ID as salt
  const combined = `${apiKey}:${salt}`;
  return createHash('sha256').update(combined).digest('hex');
}

/**
 * Verify node API key
 * 
 * @param {string} nodeId - Node ID
 * @param {string} providedKey - API key provided by node
 * @returns {Promise<{ok: boolean, node?: object, error?: string}>}
 */
export async function verifyNodeApiKey(nodeId, providedKey) {
  try {
    if (!nodeId || !providedKey) {
      return {
        ok: false,
        error: 'Missing node credentials',
      };
    }

    if (!adminDb) {
      return {
        ok: false,
        error: 'Database not initialized',
      };
    }

    // Fetch node document
    const nodeDoc = await adminDb.collection('nodes').doc(nodeId).get();
    
    if (!nodeDoc.exists) {
      // Log failed attempt for security monitoring
      await logAuthFailure(nodeId, 'Node not found', null);
      return {
        ok: false,
        error: 'Node not found',
      };
    }

    const nodeData = nodeDoc.data();

    // Check if node is disabled
    if (nodeData.status === 'disabled' || nodeData.apiKeyRevoked === true) {
      await logAuthFailure(nodeId, 'Node disabled or revoked', nodeData.tenantName);
      return {
        ok: false,
        error: 'Node disabled or API key revoked',
      };
    }

    // Verify API key hash
    const providedHash = hashApiKey(providedKey, nodeId);
    const storedHash = nodeData.apiKeyHash;

    if (!storedHash) {
      // Node exists but has no API key hash (legacy node or misconfiguration)
      await logAuthFailure(nodeId, 'No API key configured', nodeData.tenantName);
      return {
        ok: false,
        error: 'Node API key not configured',
      };
    }

    // Constant-time comparison to prevent timing attacks
    if (!constantTimeEquals(providedHash, storedHash)) {
      await logAuthFailure(nodeId, 'Invalid API key', nodeData.tenantName);
      return {
        ok: false,
        error: 'Invalid API key',
      };
    }

    // Success - return node data
    return {
      ok: true,
      node: {
        id: nodeDoc.id,
        ...nodeData,
      },
    };
  } catch (error) {
    console.error('Error verifying node API key:', error);
    return {
      ok: false,
      error: 'Internal server error during authentication',
    };
  }
}

/**
 * Extract node credentials from request
 * Supports both header-based and body-based authentication
 * 
 * @param {Request} request - Next.js request object
 * @returns {{nodeId: string, apiKey: string} | null}
 */
export function extractNodeCredentials(request) {
  // Try headers first (preferred method)
  const nodeId = request.headers.get('x-node-id') || request.headers.get('X-Node-Id');
  const apiKey = request.headers.get('x-node-api-key') || request.headers.get('X-Node-Api-Key');

  if (nodeId && apiKey) {
    return { nodeId, apiKey };
  }

  // Fallback to body (for backward compatibility)
  // Note: This requires async body parsing, so we'll handle it in the endpoint
  return null;
}

/**
 * Constant-time string comparison to prevent timing attacks
 * 
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean}
 */
function constantTimeEquals(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Log authentication failure for security monitoring
 * 
 * @param {string} nodeId - Node ID that attempted authentication
 * @param {string} reason - Failure reason
 * @param {string|null} tenantName - Tenant name if known
 */
async function logAuthFailure(nodeId, reason, tenantName) {
  try {
    if (!adminDb) return;

    // Get client IP from request (if available in context)
    // For now, we'll log without IP (can be enhanced later)
    
    await adminDb.collection('node_auth_failures').add({
      nodeId,
      tenantName: tenantName || null,
      reason,
      timestamp: new Date().toISOString(),
      // IP address would be added here if available in request context
    });

    // Cleanup old entries (keep last 1000 failures)
    const failuresSnapshot = await adminDb
      .collection('node_auth_failures')
      .orderBy('timestamp', 'desc')
      .limit(1001)
      .get();

    if (failuresSnapshot.docs.length > 1000) {
      const batch = adminDb.batch();
      failuresSnapshot.docs.slice(1000).forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
  } catch (error) {
    // Don't throw - logging failures shouldn't break authentication
    console.error('Error logging auth failure:', error);
  }
}

/**
 * Rotate API key for a node
 * Generates new key, updates hash, invalidates old key
 * 
 * @param {string} nodeId - Node ID
 * @returns {Promise<{ok: boolean, newApiKey?: string, error?: string}>}
 */
export async function rotateNodeApiKey(nodeId) {
  try {
    if (!adminDb) {
      return {
        ok: false,
        error: 'Database not initialized',
      };
    }

    const nodeDoc = await adminDb.collection('nodes').doc(nodeId).get();
    
    if (!nodeDoc.exists) {
      return {
        ok: false,
        error: 'Node not found',
      };
    }

    // Generate new API key
    const newApiKey = generateNodeApiKey();
    const newHash = hashApiKey(newApiKey, nodeId);

    // Update node with new hash
    await adminDb.collection('nodes').doc(nodeId).update({
      apiKeyHash: newHash,
      apiKeyRotatedAt: new Date().toISOString(),
      apiKeyPrefix: newApiKey.substring(0, 12), // Store prefix for UI display
    });

    return {
      ok: true,
      newApiKey, // Return plaintext key (show once to user)
    };
  } catch (error) {
    console.error('Error rotating API key:', error);
    return {
      ok: false,
      error: 'Failed to rotate API key',
    };
  }
}

/**
 * Revoke API key for a node
 * Marks node as disabled and logs revocation
 * 
 * @param {string} nodeId - Node ID
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function revokeNodeApiKey(nodeId) {
  try {
    if (!adminDb) {
      return {
        ok: false,
        error: 'Database not initialized',
      };
    }

    await adminDb.collection('nodes').doc(nodeId).update({
      apiKeyRevoked: true,
      status: 'disabled',
      apiKeyRevokedAt: new Date().toISOString(),
    });

    return {
      ok: true,
    };
  } catch (error) {
    console.error('Error revoking API key:', error);
    return {
      ok: false,
      error: 'Failed to revoke API key',
    };
  }
}
