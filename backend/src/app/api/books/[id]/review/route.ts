import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/authCookie';
import { addReview } from '@/services/reviewService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const result = await addReview(params.id, getAuthToken(request), body);
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, book: result.book }, { status: 201 });
  } catch (err) {
    console.error('[book review POST]', err);
    return NextResponse.json({ error: 'Could not save your review.' }, { status: 500 });
  }
}
