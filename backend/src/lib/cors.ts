import { NextRequest, NextResponse } from 'next/server';
import { getFrontendOrigin } from '@/lib/appUrls';

const EXTRA_ORIGINS = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export function allowedOrigins(): string[] {
  return Array.from(new Set([getFrontendOrigin(), ...EXTRA_ORIGINS]));
}

export function resolveAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  return allowedOrigins().includes(origin) ? origin : null;
}

export function applyCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = resolveAllowedOrigin(request.headers.get('origin'));
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

export function corsPreflight(request: NextRequest): NextResponse {
  return applyCorsHeaders(new NextResponse(null, { status: 204 }), request);
}
