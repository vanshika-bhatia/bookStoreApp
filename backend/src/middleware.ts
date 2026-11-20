import { NextRequest, NextResponse } from 'next/server';
import { applyCorsHeaders, corsPreflight } from '@/lib/cors';

export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return corsPreflight(request);
  }

  return applyCorsHeaders(NextResponse.next(), request);
}

export const config = {
  matcher: ['/api/:path*'],
};
