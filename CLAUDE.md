# Financial App - Claude Code Instructions

## Project Overview
Personal financial management app for family use (1-5 users). Multi-currency support with MYR as default.

## Tech Stack
- **Frontend**: React 19 + Vite + React Router 7 + Ant Design 6 + Tailwind CSS 4
- **Backend**: None — frontend talks directly to Supabase
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth (email/password)

## Commands
- `pnpm dev` - start Vite dev server (5173)
- `pnpm build` - build frontend
- `npx tsc --noEmit` - type-check entire project

Schema/migrations live in `supabase/migrations/` and are applied via the Supabase SQL Editor (or CLI). There is no Drizzle/Docker DB anymore.

## Architecture
- Single project, NOT a monorepo. Pure SPA.
- `src/` - React frontend (pages, components, lib)
- `src/lib/supabase.ts` - Supabase client (reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`)
- `src/lib/api.ts` - Supabase-backed data layer; preserves an `api.get/post/put/delete` surface so pages stay unchanged. Routes either to direct table CRUD or to Postgres RPCs (e.g. atomic balance mutations).
- `supabase/migrations/` - schema, RLS policies, and RPC functions (`*_schema.sql`, `*_rls.sql`, `*_functions.sql`)
- Row-level isolation via RLS: every table policy gates on `user_id = auth.uid()`. The anon key is safe to expose in the client — RLS is the security boundary.

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
- Data access: `src/lib/api.ts` wraps `supabase-js`. Page components import `{ api }` and call `api.get/post/put/delete` — they don't talk to supabase-js directly.
- Auth: `getUserId()` in `src/lib/supabase.ts` reads the current Supabase user; throws if not signed in.
- Money: stored as `DECIMAL(19,4)` strings in DB, parsed with `Number()` for display.
- Dates: stored as ISO date strings (`YYYY-MM-DD`).
- Balance mutations: implemented as Postgres RPCs (`create_transaction`, `update_transaction`, `delete_transaction`) so the multi-row balance update is atomic. Do NOT update balances from the client.
- Column casing: DB is snake_case; API layer aliases to camelCase in select strings (e.g. `isActive:is_active`) so the UI sees camelCase.

## Mobile UI Patterns
- Responsive hook: `useIsMobile()` in `src/hooks/useIsMobile.ts` — `window.matchMedia('(max-width: 767px)')`
- Layout: mobile uses `BottomNav` + `FloatingActionButton` (in `DashboardLayout`); desktop uses sidebar
- Mobile forms: use route-based full-screen pages (`position: fixed; inset: 0; z-index: 50`) so back gesture unmounts them naturally — NOT drawers or modals
- Desktop forms: use Ant Design `Modal`
- FAB navigates to `/transactions/new` on mobile; hidden on form pages (pathname ends with `/edit` or equals `/transactions/new`)
- Safe area: `env(safe-area-inset-bottom)` for notched phones; `viewport-fit=cover` in `index.html`
- CSS vars: `--bottom-nav-height: 56px` used for FAB and content bottom padding
- Card padding: `styles={{ body: { padding: isMobile ? 12 : 24 } }}` on mobile cards
- Card gutter: `isMobile ? [8, 8] : [16, 16]` for Row gutter
- Title sizing: `<Title level={isMobile ? 4 : 3}>` on all pages
- Currency display: `RM 83.73` format (prefix), not `83.73 MYR` (suffix)

## Component Structure
- `src/hooks/` — shared hooks (`useIsMobile`)
- `src/lib/` — utilities (`api.ts`, `categoryIcons.tsx`)
- `src/components/common/` — `FloatingActionButton`, `IconCircle`
- `src/components/navigation/` — `BottomNav`
- `src/components/layouts/` — `DashboardLayout`
- `src/components/transactions/` — `AddTransactionForm`, `CashFlowHeader`, `TransactionRow`, `TransactionTimeline`
- `src/pages/TransactionForm.tsx` — mobile full-screen form (add + edit)
- `src/pages/Categories.tsx` — income/expense tabs + CRUD

## Cross-component Refresh
- Dispatch `window.dispatchEvent(new Event("transaction-added"))` after mutations to signal list refresh
- Pages listen for this event in `useEffect` to re-fetch data

## Database
- Schema: `supabase/migrations/*_schema.sql`
- RLS policies: `supabase/migrations/*_rls.sql`
- Atomic mutation RPCs: `supabase/migrations/*_functions.sql`
- Apply migrations via the Supabase SQL Editor (paste-and-run) — there is no migration runner committed.
- Multi-row balance changes MUST live in an RPC, not the client, so they're atomic and RLS-safe.
