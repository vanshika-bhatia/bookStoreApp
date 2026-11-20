import { NextResponse } from 'next/server';
import { fetchGutendex } from '@/services/catalogProxyService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const result = await fetchGutendex(new URL(request.url).searchParams);
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: 'Gutendex request failed.' }, { status: 502 });
  }
}
