import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { getTenantSummary } from '@/lib/tenant-subscription';
import { createTenantSubscription } from '@/lib/plans';

export async function GET(request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        {
          name: 'Default Tenant',
          subscription: createTenantSubscription('essential'),
        },
        { status: 200 }
      );
    }

    let user = null;
    try {
      user = await getCurrentUser(request);
    } catch {
      return NextResponse.json(
        {
          name: 'Default Tenant',
          subscription: createTenantSubscription('essential'),
        },
        { status: 200 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          name: 'Default Tenant',
          subscription: createTenantSubscription('essential'),
        },
        { status: 200 }
      );
    }

    let tenantName = null;
    try {
      tenantName = await getTenantName(user);
    } catch {
      return NextResponse.json(
        {
          name: 'Default Tenant',
          subscription: createTenantSubscription('essential'),
        },
        { status: 200 }
      );
    }

    if (!tenantName) {
      return NextResponse.json(
        {
          name: 'Default Tenant',
          subscription: createTenantSubscription('essential'),
        },
        { status: 200 }
      );
    }

    const tenant = await getTenantSummary(adminDb, tenantName);
    if (!tenant) {
      return NextResponse.json(
        {
          name: 'Default Tenant',
          subscription: createTenantSubscription('essential'),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Error fetching current tenant:', error);
    return NextResponse.json(
      {
        name: 'Default Tenant',
        subscription: createTenantSubscription('essential'),
      },
      { status: 200 }
    );
  }
}
