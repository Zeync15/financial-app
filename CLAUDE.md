# Financial App - Claude Code Instructions

## Project Overview
Personal financial management app for family use (1-5 users). Multi-currency support with MYR as default.

## Tech Stack
- **Frontend**: React 19 + Vite + React Router 7 + Ant Design 6 + Tailwind CSS 4
- **Backend**: Hono (Node.js) on port 3001
- **Database**: PostgreSQL 16 (Docker) + Drizzle ORM
- **Auth**: Better Auth (email/password, session cookies)

## Commands
- `docker compose up -d` - start PostgreSQL
- `pnpm dev` - start both Vite (5173) and Hono (3001) dev servers
- `pnpm build` - build frontend
- `pnpm db:push` - push Drizzle schema to database
- `pnpm db:generate` - generate migration files
- `npx tsc --noEmit` - type-check entire project

## Architecture
- Single project, NOT a monorepo
- `server/` - Hono backend (API routes, auth, DB schema)
- `src/` - React frontend (pages, components, lib)
- Vite proxies `/api/*` to Hono during dev
- All API routes require auth via `requireAuth` middleware
- All DB queries scoped to `userId` from session (row-level isolation)

## Preferences
- Keep it simple. MVP first, optimize later.
- Ant Design 6 for UI components.
- Tailwind CSS 4 for custom layout and utility classes.
- No testing framework until asked.
- No deployment config until asked.
- No PWA/service workers until asked.
- Always verify the app compiles (`pnpm build` + `tsc --noEmit`) before marking done.
- Do NOT create new documentation files unless asked.

## Key Patterns
- Server routes: `new Hono<AppEnv>()` with typed context from `server/types.ts`
- Auth: `c.get('user')!` in routes after `requireAuth` middleware
- API client: `src/lib/api.ts` wraps fetch with credentials + JSON
- Money: stored as `DECIMAL(19,4)` strings in DB, parsed with `Number()` for display
- Dates: stored as ISO date strings (`YYYY-MM-DD`)

## Database
- Schema in `server/schema/auth.ts` (Better Auth tables) and `server/schema/app.ts` (financial tables)
- Drizzle config: `drizzle.config.ts`
- Connection: `server/db.ts`
