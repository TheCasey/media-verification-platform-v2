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
- `ADMIN_PASSWORD` (required for MVP login; recommended to migrate to hash + signed sessions)
- `ADMIN_PASSWORD_HASH` (recommended; if present can be used instead of plaintext)
- `SESSION_SECRET` (recommended; used to sign admin sessions)
- `RESEND_API_KEY` (optional)

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
