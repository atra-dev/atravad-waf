import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getCurrentUser } from '@/lib/api-helpers';
import { getUserRole, isSuperAdmin, ROLES } from '@/lib/rbac';
import { normalizeEmail, normalizeTenantName } from '@/lib/user-utils';

/**
 * GET /api/admin/users
 * List all users across all tenants (Super Admin only)
 */
export async function GET(request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const user = await getCurrentUser(request);
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const userRole = await getUserRole(adminDb, user.email);
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    // Get all users
    const usersSnapshot = await adminDb.collection('users').get();
    const users = await Promise.all(
      usersSnapshot.docs.map(async (doc) => {
        const userData = doc.data();
        let tenantData = null;
        
        // Get tenant info if user has a tenant
        if (userData.tenantName) {
          const tenantDoc = await adminDb
            .collection('tenants')
            .doc(userData.tenantName)
            .get();
          
          if (tenantDoc.exists) {
            tenantData = {
              id: tenantDoc.id,
              name: tenantDoc.data().name,
            };
          }
        }

        return {
          id: doc.id, // Email is the document ID
          email: userData.email,
          role: userData.role,
          tenantName: userData.tenantName,
          tenant: tenantData,
          authProvider: userData.authProvider || 'password',
          invitationPending: userData.invitationPending === true,
          invitedAt: userData.invitedAt || null,
          acceptedAt: userData.acceptedAt || null,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        };
      })
    );

    // Sort by creation date (newest first)
    users.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create a new user (admin or client) for a tenant (Super Admin only)
 * Body: { email, password?, role, tenantName, authProvider? }
 */
export async function POST(request) {
  try {
    if (!adminDb || !adminAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const user = await getCurrentUser(request);
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const userRole = await getUserRole(adminDb, user.email);
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, role, tenantName, authProvider } = body;
    const normalizedAuthProvider = authProvider === 'google' ? 'google' : 'password';

    // Validation
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (!role || (role !== ROLES.ADMIN && role !== ROLES.CLIENT)) {
      return NextResponse.json(
        { error: 'Role must be either "admin" or "client"' },
        { status: 400 }
      );
    }

    if (!tenantName) {
      return NextResponse.json(
        { error: 'Tenant name is required' },
        { status: 400 }
      );
    }

    // Normalize email and tenant name
    const normalizedEmail = normalizeEmail(email);
    const normalizedTenantName = normalizeTenantName(tenantName);

    if (!normalizedTenantName) {
      return NextResponse.json(
        { error: 'Invalid tenant name' },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const tenantDoc = await adminDb.collection('tenants').doc(normalizedTenantName).get();
    if (!tenantDoc.exists) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if user already exists
    const existingUserDoc = await adminDb.collection('users').doc(normalizedEmail).get();
    if (existingUserDoc.exists) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    if (normalizedAuthProvider === 'password' && (!password || String(password).length < 6)) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters for password-based accounts' },
        { status: 400 }
      );
    }

    // Create user in Firebase Auth only for password-based managed accounts.
    let firebaseUser = null;
    try {
      if (normalizedAuthProvider === 'password') {
        firebaseUser = await adminAuth.createUser({
          email: normalizedEmail,
          password: password,
          emailVerified: false,
        });
      }
    } catch (authError) {
      console.error('Error creating Firebase Auth user:', authError);
      if (authError.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'User already exists in Firebase Auth' },
          { status: 400 }
        );
      }
      throw authError;
    }

    // Create user document in Firestore
    const now = new Date().toISOString();
    const userData = {
      email: normalizedEmail,
      uid: firebaseUser?.uid || null,
      role: role,
      tenantName: normalizedTenantName,
      authProvider: normalizedAuthProvider,
      invitationPending: normalizedAuthProvider === 'google',
      invitedAt: normalizedAuthProvider === 'google' ? now : null,
      acceptedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.collection('users').doc(normalizedEmail).set(userData);

    // Get tenant info for response
    const tenantData = {
      id: tenantDoc.id,
      name: tenantDoc.data().name,
    };

    return NextResponse.json({
      id: normalizedEmail,
      email: normalizedEmail,
      role: role,
      tenantName: normalizedTenantName,
      tenant: tenantData,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      authProvider: userData.authProvider,
      invitationPending: userData.invitationPending,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users
 * Update user role, tenant, and managed auth mode (Super Admin only)
 * Body: { email, role?, tenantName?, authProvider?, password? }
 */
export async function PUT(request) {
  try {
    if (!adminDb || !adminAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const user = await getCurrentUser(request);
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const userRole = await getUserRole(adminDb, user.email);
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role, tenantName, authProvider, password } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if user exists
    const userDoc = await adminDb.collection('users').doc(normalizedEmail).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Prevent modifying super_admin
    if (userData.role === ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Cannot modify super admin user' },
        { status: 403 }
      );
    }

    // Build update data
    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    if (role !== undefined) {
      if (role !== ROLES.ADMIN && role !== ROLES.CLIENT) {
        return NextResponse.json(
          { error: 'Role must be either "admin" or "client"' },
          { status: 400 }
        );
      }
      updateData.role = role;
    }

    if (tenantName !== undefined) {
      if (tenantName === null || tenantName === '') {
        // Remove tenant assignment
        updateData.tenantName = null;
      } else {
        // Validate and normalize tenant name
        const normalizedTenantName = normalizeTenantName(tenantName);
        if (!normalizedTenantName) {
          return NextResponse.json(
            { error: 'Invalid tenant name' },
            { status: 400 }
          );
        }

        // Check if tenant exists
        const tenantDoc = await adminDb.collection('tenants').doc(normalizedTenantName).get();
        if (!tenantDoc.exists) {
          return NextResponse.json(
            { error: 'Tenant not found' },
            { status: 404 }
          );
        }

        updateData.tenantName = normalizedTenantName;
      }
    }

    if (authProvider !== undefined) {
      const nextAuthProvider = authProvider === 'google' ? 'google' : 'password';
      const previousAuthProvider = userData.authProvider || 'password';

      if (nextAuthProvider === 'password') {
        if (!password || String(password).length < 6) {
          return NextResponse.json(
            { error: 'Password must be at least 6 characters when converting to password access' },
            { status: 400 }
          );
        }

        try {
          if (userData.uid) {
            await adminAuth.updateUser(userData.uid, { password });
            updateData.uid = userData.uid;
          } else {
            const existingAuthUser = await adminAuth.getUserByEmail(normalizedEmail).catch((error) => {
              if (error.code === 'auth/user-not-found') return null;
              throw error;
            });

            if (existingAuthUser) {
              await adminAuth.updateUser(existingAuthUser.uid, { password });
              updateData.uid = existingAuthUser.uid;
            } else {
              const createdAuthUser = await adminAuth.createUser({
                email: normalizedEmail,
                password,
                emailVerified: false,
              });
              updateData.uid = createdAuthUser.uid;
            }
          }
        } catch (authError) {
          console.error('Error converting user to password auth:', authError);
          return NextResponse.json(
            { error: 'Failed to convert account to password-based access' },
            { status: 500 }
          );
        }

        updateData.authProvider = 'password';
        updateData.invitationPending = false;
        updateData.acceptedAt =
          previousAuthProvider === 'password'
            ? (userData.acceptedAt || null)
            : new Date().toISOString();
        updateData.invitedAt = userData.invitedAt || null;
      } else {
        updateData.authProvider = 'google';
        updateData.invitationPending = true;
        updateData.acceptedAt = null;
        updateData.invitedAt = new Date().toISOString();
      }
    }

    // Update user document
    await adminDb.collection('users').doc(normalizedEmail).update(updateData);

    // Get updated user data
    const updatedUserDoc = await adminDb.collection('users').doc(normalizedEmail).get();
    const updatedUserData = updatedUserDoc.data();

    // Get tenant info if exists
    let tenantData = null;
    if (updatedUserData.tenantName) {
      const tenantDoc = await adminDb
        .collection('tenants')
        .doc(updatedUserData.tenantName)
        .get();
      
      if (tenantDoc.exists) {
        tenantData = {
          id: tenantDoc.id,
          name: tenantDoc.data().name,
        };
      }
    }

    return NextResponse.json({
      id: normalizedEmail,
      email: normalizedEmail,
      role: updatedUserData.role,
      tenantName: updatedUserData.tenantName,
      tenant: tenantData,
      authProvider: updatedUserData.authProvider || 'password',
      invitationPending: updatedUserData.invitationPending === true,
      invitedAt: updatedUserData.invitedAt || null,
      acceptedAt: updatedUserData.acceptedAt || null,
      createdAt: updatedUserData.createdAt,
      updatedAt: updatedUserData.updatedAt,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user (Super Admin only)
 * Body: { email }
 */
export async function DELETE(request) {
  try {
    if (!adminDb || !adminAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const user = await getCurrentUser(request);
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const userRole = await getUserRole(adminDb, user.email);
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if user exists
    const userDoc = await adminDb.collection('users').doc(normalizedEmail).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Prevent deleting super_admin
    if (userData.role === ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Cannot delete super admin user' },
        { status: 403 }
      );
    }

    // Prevent deleting yourself
    if (normalizedEmail === normalizeEmail(user.email)) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete from Firebase Auth
    try {
      if (userData.uid) {
        await adminAuth.deleteUser(userData.uid);
      }
    } catch (authError) {
      console.error('Error deleting Firebase Auth user:', authError);
      // Continue with Firestore deletion even if Auth deletion fails
    }

    // Delete from Firestore
    await adminDb.collection('users').doc(normalizedEmail).delete();

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
