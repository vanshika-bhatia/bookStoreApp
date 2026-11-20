import { NextResponse } from 'next/server';
import { fetchGoogleBooks } from '@/services/catalogProxyService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const result = await fetchGoogleBooks(new URL(request.url).searchParams);
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: 'Google Books request failed.' }, { status: 502 });
  }
}
