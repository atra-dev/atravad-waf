/**
 * RBAC (Role-Based Access Control) utility functions
 * 
 * Roles:
 * - super_admin: Platform-wide access, can see all tenants, all users, all activity
 * - admin: Full access to all features within their tenant (create, read, update, delete)
 * - analyst: Can view and analyze data within their tenant (read-only for most, can view logs)
 * - client: Limited read-only access within their tenant (can view their own resources)
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  ANALYST: 'analyst',
  CLIENT: 'client',
};

import { getUserByEmail, getUserByUid, normalizeEmail } from '@/lib/user-utils';

/**
 * Get user's role from Firestore (by email)
 */
export async function getUserRole(adminDb, userEmail) {
  if (!adminDb || !userEmail) return null;
  
  try {
    const user = await getUserByEmail(adminDb, userEmail);
    if (!user) return null;
    return user.role || ROLES.CLIENT;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(userRole, requiredRole) {
  const roleHierarchy = {
    [ROLES.SUPER_ADMIN]: 4,
    [ROLES.ADMIN]: 3,
    [ROLES.ANALYST]: 2,
    [ROLES.CLIENT]: 1,
  };
  
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(userRole) {
  return userRole === ROLES.SUPER_ADMIN;
}

/**
 * Check if user can perform action on resource
 */
export function canPerformAction(userRole, action, resourceType) {
  // Super Admin can do everything across all tenants
  if (userRole === ROLES.SUPER_ADMIN) {
    return true;
  }
  
  // Admin can do everything within their tenant
  if (userRole === ROLES.ADMIN) {
    return true;
  }
  
  // Action permissions by role
  const permissions = {
    [ROLES.ANALYST]: {
      policies: { read: true, create: false, update: false, delete: false, deploy: false },
      nodes: { read: true, create: false, update: false, delete: false },
      apps: { read: true, create: false, update: false, delete: false },
      logs: { read: true, create: false },
      tenants: { read: true, create: false, update: false },
      users: { read: true, create: false, update: false, delete: false },
    },
    [ROLES.CLIENT]: {
      policies: { read: true, create: false, update: false, delete: false, deploy: false },
      nodes: { read: true, create: false, update: false, delete: false },
      apps: { read: true, create: false, update: false, delete: false },
      logs: { read: true, create: false },
      tenants: { read: true, create: false, update: false },
      users: { read: false, create: false, update: false, delete: false },
    },
  };
  
  const rolePermissions = permissions[userRole];
  if (!rolePermissions || !rolePermissions[resourceType]) {
    return false;
  }
  
  return rolePermissions[resourceType][action] === true;
}

/**
 * Check authorization for API request
 * @param {Firestore} adminDb - Firestore instance
 * @param {string} userEmail - User email address
 * @param {string} action - Action to check (read, create, update, delete, deploy)
 * @param {string} resourceType - Resource type (policies, nodes, apps, logs, tenants)
 */
export async function checkAuthorization(adminDb, userEmail, action, resourceType) {
  const userRole = await getUserRole(adminDb, userEmail);
  if (!userRole) {
    return { authorized: false, error: 'User role not found' };
  }
  
  const authorized = canPerformAction(userRole, action, resourceType);
  
  return {
    authorized,
    role: userRole,
    error: authorized ? null : `User with role '${userRole}' cannot ${action} ${resourceType}`,
  };
}
