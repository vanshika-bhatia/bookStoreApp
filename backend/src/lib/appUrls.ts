/** Origins for the split frontend/backend deployment. */

export function getFrontendOrigin(): string {
  return (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').replace(/\/+$/, '');
}

export function getBackendOrigin(request?: Request): string {
  const configured =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.APP_URL?.trim();
  const base = configured || (request ? new URL(request.url).origin : 'http://localhost:3001');
  return base.replace(/\/+$/, '');
}

/** Only allow same-origin relative paths as a post-login destination. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}
