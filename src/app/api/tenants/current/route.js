import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';

export async function GET(request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ name: 'Default Tenant' }, { status: 200 });
    }

    let user = null;
    try {
      user = await getCurrentUser(request);
    } catch {
      return NextResponse.json({ name: 'Default Tenant' }, { status: 200 });
    }

    if (!user) {
      return NextResponse.json({ name: 'Default Tenant' }, { status: 200 });
    }

    let tenantName = null;
    try {
      tenantName = await getTenantName(user);
    } catch {
      return NextResponse.json({ name: 'Default Tenant' }, { status: 200 });
    }

    if (!tenantName) {
      return NextResponse.json({ name: 'Default Tenant' }, { status: 200 });
    }

    const tenantDoc = await adminDb.collection('tenants').doc(tenantName).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ name: 'Default Tenant' }, { status: 200 });
    }

    return NextResponse.json({
      id: tenantDoc.id,
      ...tenantDoc.data(),
    });
  } catch (error) {
    console.error('Error fetching current tenant:', error);
    return NextResponse.json({ name: 'Default Tenant' }, { status: 200 });
  }
}
