import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser } from '@/lib/api-helpers';

export async function GET(request, { params }) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Please check your environment variables.' },
        { status: 500 }
      );
    }

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const policyDoc = await adminDb.collection('policies').doc(id).get();

    if (!policyDoc.exists) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: policyDoc.id,
      ...policyDoc.data(),
    });
  } catch (error) {
    console.error('Error fetching policy:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
