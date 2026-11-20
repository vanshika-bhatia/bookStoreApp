# BookHaven — split Next.js apps

The store is two independent Next.js 14 applications:

- `frontend/` — UI, App Router pages, Axios client
- `backend/` — App Router Route Handlers, MongoDB, JWT cookies, email, OAuth

The original monolith remains under `bookStore-main (1)/bookStore-main` until you delete it.

## Run locally

1. Copy `backend/.env.example` to `backend/.env.local` and fill secrets.
2. Copy `frontend/.env.example` to `frontend/.env.local`.
3. Start the API, then the UI:

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

Google OAuth redirect URI used by the UI: `http://localhost:3001/api/auth/social/google/callback` (the Auth.js `/api/auth/callback/google` route is also kept for compatibility). Add Google credentials in `backend/.env.local` as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

For two different production domains, set `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true` on the backend so the HTTP-only JWT cookie is sent cross-site.
