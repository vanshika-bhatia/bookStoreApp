import { NextRequest, NextResponse } from 'next/server';
import { createTokenForUser } from '@/lib/authStore';
import { setAuthCookie } from '@/lib/authCookie';
import { findOrCreateOAuthUser, OAuthProviderId } from '@/lib/oauthUser';
import {
  OAUTH_NEXT_COOKIE,
  OAUTH_PROVIDER_COOKIE,
  OAUTH_STATE_COOKIE,
  exchangeCodeForAccessToken,
  fetchOAuthProfile,
  isOAuthProvider,
  isProviderConfigured,
} from '@/lib/oauth';
import { getFrontendOrigin, safeNextPath } from '@/lib/appUrls';

export const dynamic = 'force-dynamic';

function failure(reason: string) {
  const url = new URL('/login', getFrontendOrigin());
  url.searchParams.set('socialError', reason);
  return NextResponse.redirect(url);
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set(OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 });
  response.cookies.set(OAUTH_PROVIDER_COOKIE, '', { path: '/', maxAge: 0 });
  response.cookies.set(OAUTH_NEXT_COOKIE, '', { path: '/', maxAge: 0 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider;

  if (!isOAuthProvider(provider)) {
    return failure('unsupported_provider');
  }

  if (!isProviderConfigured(provider)) {
    return failure(`${provider}_not_configured`);
  }

  const searchParams = request.nextUrl.searchParams;
  const oauthError = searchParams.get('error');
  if (oauthError) {
    const reason = oauthError === 'access_denied' ? 'access_denied' : 'oauth_failed';
    const response = failure(reason);
    clearOAuthCookies(response);
    return response;
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const storedProvider = request.cookies.get(OAUTH_PROVIDER_COOKIE)?.value;

  if (!code || !state || !storedState || state !== storedState || storedProvider !== provider) {
    const response = failure('invalid_state');
    clearOAuthCookies(response);
    return response;
  }

  let stage: 'token' | 'profile' | 'account' | 'session' = 'token';

  try {
    const accessToken = await exchangeCodeForAccessToken(provider, code, request);
    stage = 'profile';
    const profile = await fetchOAuthProfile(provider, accessToken);

    // Same shared find/link/create logic used by the Auth.js bridge, so
    // provider links, avatar and existing profile data are preserved.
    stage = 'account';
    const user = await findOrCreateOAuthUser({
      provider: provider as OAuthProviderId,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
      name: profile.name,
      image: profile.picture,
    });

    stage = 'session';
    const token = createTokenForUser(user);
    const nextPath = safeNextPath(request.cookies.get(OAUTH_NEXT_COOKIE)?.value);
    const response = NextResponse.redirect(new URL(nextPath, getFrontendOrigin()));
    setAuthCookie(response, token);
    clearOAuthCookies(response);
    return response;
  } catch (error) {
    console.error(`[${provider} oauth callback] stage=${stage}`, error);
    const reason =
      error instanceof Error && error.message.includes('email not verified')
        ? 'email_not_verified'
        : `oauth_${stage}_failed`;
    const response = failure(reason);
    clearOAuthCookies(response);
    return response;
  }
}
