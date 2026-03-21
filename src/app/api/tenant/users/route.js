import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { getUserRole, ROLES } from '@/lib/rbac';
import { normalizeEmail } from '@/lib/user-utils';
import { getTenantLimitStatus, invalidateTenantSubscriptionCache } from '@/lib/tenant-subscription';

function generateTemporaryPassword() {
  return `Tmp!${Math.random().toString(36).slice(2, 10)}9Z`;
}

async function requireTenantAdmin(request) {
  if (!adminDb || !adminAuth) {
    return { errorResponse: NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 }) };
  }

  const user = await getCurrentUser(request);
  if (!user || !user.email) {
    return { errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const role = await getUserRole(adminDb, user.email);
  if (role !== ROLES.ADMIN && role !== ROLES.SUPER_ADMIN) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      ),
    };
  }

  const tenantName = await getTenantName(user);
  if (!tenantName) {
    return {
      errorResponse: NextResponse.json(
        { error: 'User is not assigned to a tenant' },
        { status: 400 }
      ),
    };
  }

  return {
    user,
    role,
    tenantName,
  };
}

/**
 * GET /api/tenant/users
 * List users within the current admin's tenant
 */
export async function GET(request) {
  try {
    const ctx = await requireTenantAdmin(request);
    if (ctx.errorResponse) return ctx.errorResponse;

    const { tenantName } = ctx;

    const usersSnapshot = await adminDb
      .collection('users')
      .where('tenantName', '==', tenantName)
      .get();

    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        role: data.role,
        tenantName: data.tenantName,
        invitationPending: data.invitationPending === true,
        invitedAt: data.invitedAt || null,
        acceptedAt: data.acceptedAt || null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    // Sort by creation date (newest first)
    users.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching tenant users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenant/users
 * Invite a new client/admin user inside the current admin's tenant.
 * Body: { email, role }
 */
export async function POST(request) {
  try {
    const ctx = await requireTenantAdmin(request);
    if (ctx.errorResponse) return ctx.errorResponse;

    const { tenantName } = ctx;
    const body = await request.json();
    const { email, role } = body;

    const userLimit = await getTenantLimitStatus(adminDb, tenantName, 'maxUsers');
    if (!userLimit.allowed) {
      return NextResponse.json(
        {
          error: `Plan limit reached: ${userLimit.current} of ${userLimit.limit} managed users used`,
          code: 'PLAN_LIMIT_MAX_USERS',
          limit: userLimit.limit,
          current: userLimit.current,
          planId: userLimit.tenant?.planId || null,
        },
        { status: 403 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const allowedRoles = [ROLES.CLIENT, ROLES.ADMIN];
    const userRoleToSet = role || ROLES.CLIENT;
    if (!allowedRoles.includes(userRoleToSet)) {
      return NextResponse.json(
        { error: 'Role must be either "client" or "admin"' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if user already exists in Firestore
    const existingUserDoc = await adminDb.collection('users').doc(normalizedEmail).get();
    if (existingUserDoc.exists) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create or reuse Firebase Auth user so Firebase can send a password-setup email.
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUserByEmail(normalizedEmail);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        firebaseUser = await adminAuth.createUser({
          email: normalizedEmail,
          password: generateTemporaryPassword(),
          emailVerified: false,
        });
      } else {
        console.error('Error preparing Firebase Auth user (tenant):', authError);
        throw authError;
      }
    }

    const now = new Date().toISOString();
    const userData = {
      email: normalizedEmail,
      uid: firebaseUser.uid,
      role: userRoleToSet,
      tenantName,
      invitationPending: true,
      invitedAt: now,
      acceptedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await adminDb.collection('users').doc(normalizedEmail).set(userData);
    invalidateTenantSubscriptionCache(tenantName);

    return NextResponse.json(
      {
        id: normalizedEmail,
        email: normalizedEmail,
        role: userRoleToSet,
        tenantName,
        invitationPending: true,
        invitedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tenant user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tenant/users
 * Update user role (within same tenant)
 * Body: { email, role }
 */
export async function PUT(request) {
  try {
    const ctx = await requireTenantAdmin(request);
    if (ctx.errorResponse) return ctx.errorResponse;

    const { tenantName } = ctx;
    const body = await request.json();
    const { email, role } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const userDoc = await adminDb.collection('users').doc(normalizedEmail).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Ensure user is in the same tenant
    if (userData.tenantName !== tenantName) {
      return NextResponse.json(
        { error: 'Cannot modify user from another tenant' },
        { status: 403 }
      );
    }

    // Prevent modifying admins and super admins here
    if (userData.role === ROLES.ADMIN || userData.role === ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Cannot modify admin or super admin from tenant endpoint' },
        { status: 403 }
      );
    }

    const allowedRoles = [ROLES.CLIENT, ROLES.ADMIN];
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Role must be either "client" or "admin"' },
        { status: 400 }
      );
    }

    const updatedData = {
      ...userData,
      role,
      updatedAt: new Date().toISOString(),
    };

    await adminDb.collection('users').doc(normalizedEmail).update({
      role,
      updatedAt: updatedData.updatedAt,
    });

    return NextResponse.json({
      id: normalizedEmail,
      email: updatedData.email,
      role: updatedData.role,
      tenantName: updatedData.tenantName,
      createdAt: updatedData.createdAt,
      updatedAt: updatedData.updatedAt,
    });
  } catch (error) {
    console.error('Error updating tenant user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenant/users
 * Delete a user inside the current tenant
 * Body: { email }
 */
export async function DELETE(request) {
  try {
    const ctx = await requireTenantAdmin(request);
    if (ctx.errorResponse) return ctx.errorResponse;

    const { tenantName, user: currentUser } = ctx;
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const userDoc = await adminDb.collection('users').doc(normalizedEmail).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Ensure user is in the same tenant
    if (userData.tenantName !== tenantName) {
      return NextResponse.json(
        { error: 'Cannot delete user from another tenant' },
        { status: 403 }
      );
    }

    // Prevent deleting admins / super admins from this endpoint
    if (userData.role === ROLES.ADMIN || userData.role === ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Cannot delete admin or super admin from tenant endpoint' },
        { status: 403 }
      );
    }

    // Prevent deleting yourself
    if (normalizedEmail === normalizeEmail(currentUser.email)) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete from Firebase Auth if UID present
    try {
      if (userData.uid) {
        await adminAuth.deleteUser(userData.uid);
      }
    } catch (authError) {
      console.error('Error deleting Firebase Auth user (tenant):', authError);
      // Continue Firestore deletion even if Auth deletion fails
    }

    await adminDb.collection('users').doc(normalizedEmail).delete();
    invalidateTenantSubscriptionCache(tenantName);

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


