import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser } from '@/lib/api-helpers';
import { getUserRole, isSuperAdmin } from '@/lib/rbac';

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
