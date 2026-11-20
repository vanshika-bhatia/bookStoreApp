import { NextResponse } from 'next/server';
import { isProviderConfigured } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

/**
 * Tells the UI whether Google OAuth has server-side credentials.
 * Only a boolean is exposed — never the client ID or secret.
 */
export function GET() {
  return NextResponse.json({ google: isProviderConfigured('google') });
}
