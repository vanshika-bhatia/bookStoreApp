import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createTokenForUser, findUserById } from '@/lib/authStore';
import { setAuthCookie } from '@/lib/authCookie';
import { getFrontendOrigin, safeNextPath } from '@/lib/appUrls';

export const dynamic = 'force-dynamic';

/**
 * Converts a completed Auth.js OAuth session into the application's existing
 * `bookhaven_auth` JWT cookie, then redirects to the frontend.
 */
export async function GET(request: NextRequest) {
  const nextPath = safeNextPath(request.nextUrl.searchParams.get('next'));
  const frontend = getFrontendOrigin();

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.redirect(new URL('/login?socialError=oauth_failed', frontend));
  }

  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.redirect(new URL('/login?socialError=oauth_failed', frontend));
  }

  const token = createTokenForUser(user);
  const response = NextResponse.redirect(new URL(nextPath, frontend));
  setAuthCookie(response, token);
  return response;
}
