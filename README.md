# Media Verification Platform v2 (Greenfield)

A single-deployment, multi-tenant media **preflight verification** platform.

## Scope boundary
- Media files are processed **client-side only**.
- The backend receives and stores **JSON metadata + validation results only** (no file uploads).

## Tech stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Cloudflare Pages Functions
- Database: Cloudflare D1 (SQLite)
- Optional email: Resend

## Local development
### 1) Install deps
```bash
npm install
```

### 2) Run the frontend dev server (UI only)
```bash
npm run dev
```

### 3) Run Pages Functions locally (UI + Functions)
Cloudflare Pages Functions don’t run inside Vite by default. Use Wrangler Pages dev and proxy to Vite.

In one terminal:
```bash
npm run dev
```

In another terminal:
```bash
npm run dev:cf
```

## D1 setup
Create and migrate:
```bash
npx wrangler d1 create media-verification-platform-v2-db
npx wrangler d1 execute media-verification-platform-v2-db --file=./schema.sql
```

Then update `wrangler.toml` with your `database_id`.

## Environment variables (Cloudflare Pages)
- `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH` (one is required; the hash takes precedence when set)
- `SESSION_SECRET` (required by the implemented login/session handlers)
- `RESEND_API_KEY` (optional)


## Review and test boundaries

This is a prototype, with no automated test script currently configured. Metadata checks are preflight checks and do not prove media authenticity.

Run `npm run lint` and `npm run build` as separate static checks. Manual QA should cover missing EXIF, absent GPS, disallowed MIME types, empty files, file-count limits, rejected submissions, admin authentication, and project isolation. Use synthetic media with fabricated metadata and record expected/actual results.

The repository currently tracks local `.wrangler/state/` database files. The ignore rule prevents new untracked state from being added; it does not remove already-tracked files or historical copies. Review local-state cleanup separately before treating the repository as portfolio-ready.

## Related repository

[The earlier media verification experiment](https://github.com/TheCasey/media-verification-platform) has a separate implementation. This repository's v2 name does not by itself establish production readiness or complete feature parity.
