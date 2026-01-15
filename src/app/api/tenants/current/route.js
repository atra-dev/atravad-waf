import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';

export async function GET(request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ name: 'Default Tenant' });
    }

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ name: 'Default Tenant' });
    }

    const tenantName = await getTenantName(user);

    if (!tenantName) {
      return NextResponse.json({ name: 'Default Tenant' });
    }

    const tenantDoc = await adminDb.collection('tenants').doc(tenantName).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ name: 'Default Tenant' });
    }

    return NextResponse.json({
      id: tenantDoc.id,
      ...tenantDoc.data(),
    });
  } catch (error) {
    console.error('Error fetching current tenant:', error);
    return NextResponse.json({ name: 'Default Tenant' });
  }
}
