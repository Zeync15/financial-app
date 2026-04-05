# Changelog

## 2026-04-05 - Mobile-first UI Overhaul (Phase 1–3 Complete)

### Added
- **Bottom navigation** (`src/components/navigation/BottomNav.tsx`) — 5-tab mobile nav (Dashboard, Wallets, Transactions, Budgets, More) with "More" drawer (Categories, Investments, Loans, theme toggle, sign out)
- **Floating Action Button** (`src/components/common/FloatingActionButton.tsx`) — green FAB above bottom nav, navigates to `/transactions/new`; hidden on form pages
- **Transaction timeline** (`TransactionTimeline.tsx`, `TransactionRow.tsx`, `CashFlowHeader.tsx`) — Spendee-style date-grouped list replacing Ant Design Table; daily totals, colored icon circles, tap-to-edit
- **Route-based transaction form** (`src/pages/TransactionForm.tsx`) — full-screen fixed overlay at `/transactions/new` and `/transactions/:id/edit`; back gesture unmounts naturally; 2-column layout
- **Transaction editing** — `PUT /api/transactions/:id` with balance reversal/re-application
- **Categories page** (`src/pages/Categories.tsx`) — Income/Expense segmented tabs, full CRUD; system defaults labelled, user categories editable
- **`/api/categories` backend route** (`server/routes/categories.ts`) — GET, POST, PUT, DELETE extracted from `/api/budgets`
- **`useIsMobile` hook** (`src/hooks/useIsMobile.ts`) — `window.matchMedia('(max-width: 767px)')` with listener cleanup
- **`IconCircle` component** (`src/components/common/IconCircle.tsx`) — shared 40px colored icon circle
- **Category icon mapping** (`src/lib/categoryIcons.tsx`) — name-based icon resolution with `getCategoryIcon()`

### Changed
- **DashboardLayout** — mobile sidebar replaced with BottomNav + FAB; safe-area bottom padding; content `p-3` on mobile
- **Transactions page** — Table → timeline; mobile tap → edit route; desktop tap → modal
- **Accounts page** — Table → tappable card list (icon circle + name + institution + balance); delete in edit modal footer
- **Budgets page** — removed category management; API updated to `/categories`
- **Dashboard page** — responsive stacking (`xs={24}`); `RM` prefix; negative net worth in red; compact mobile cards
- **Loans, Investments pages** — smaller card padding + gutter on mobile; responsive title level
- **BottomNav** — "Activity" → "Dashboard"; Categories added to More drawer
- **Desktop sidebar** — Categories added to menu
- **`index.html`** — `viewport-fit=cover` for notched phones
- **`src/index.css`** — `--bottom-nav-height: 56px`; `overflow-x: hidden`; `.pb-safe`

### Fixed
- **DB transaction atomicity** — PUT and DELETE endpoints wrap all balance mutations in `db.transaction()`
- **N+1 query in budgets GET** — `accountIds` SELECT hoisted out of per-budget loop
- **Parallel account ownership checks** — PUT fetches old + new account via `Promise.all`
- **`applyAmount()` helper** — `income → +amount, else → -amount`; replaced redundant expense/transfer ternary arms
- **Async delete in Accounts modal** — `onConfirm` now `await`s `handleDelete` before closing modal
- **Dead `initialValues` on Category Modal** — removed duplicate prop (Ant Design ignores it on `<Modal>`)

---

## 2026-03-03 - MVP (Phase 0 Complete)

### Architecture Decisions
- **React + Vite SPA** over Next.js SSR - simpler, faster dev, no SSR complexity for a private app
- **Hono** over Express - lightweight, TypeScript-native, standard Request/Response API
- **Ant Design 6** for UI - comprehensive component library with Tables, Forms, Modals, Statistics
- **Tailwind CSS 4** for layout - utility-first CSS for custom spacing and responsive design
- **Drizzle ORM** over Prisma - lighter, SQL-like, type-safe without code generation step
- **Better Auth** over NextAuth - framework-agnostic, self-hosted, works with any backend
- **Single project** over monorepo - simpler for MVP, no Turborepo overhead
- **PostgreSQL `DECIMAL(19,4)`** for money - avoids floating-point rounding errors
- **Vite proxy** over embedded server - clean separation of frontend and backend processes

### What Was Built

#### Backend (Hono)
- Auth endpoints via Better Auth (register, login, logout, session management)
- Session middleware with typed Hono context
- CRUD API routes for: accounts, transactions, budgets, categories, portfolios, holdings, loans
- Dashboard aggregation endpoint (net worth, monthly income/expenses)
- Amortization calculator (fixed payment and reducing balance methods)
- Row-level data isolation (all queries filtered by authenticated userId)

#### Frontend (React)
- Login and register pages with form validation
- Protected route wrapper (redirects to login if not authenticated)
- Collapsible sidebar layout with navigation
- Dashboard with net worth, assets, income/expense statistics
- Accounts page: table view with create/edit/delete modals
- Transactions page: table with category/account joins, create/delete
- Budgets page: card grid with progress bars showing spent vs budgeted
- Category management (create expense/income categories)
- Investments page: collapsible portfolio panels with holdings tables
- Loans page: loan cards with statistics, amortization schedule viewer

#### Database
- 12 tables: user, session, account, verification (auth) + financial_account, category, transaction, budget, portfolio, holding, investment_transaction, loan, exchange_rate
- 7 enum types for account types, transaction types, etc.

### What Was NOT Built (Deferred)
- Testing (unit, integration, e2e)
- PWA / service workers / offline support
- Docker production container
- CSV import for bank statements
- Live market price fetching for investments
- Exchange rate auto-fetching
- Dark mode toggle
- Data export (CSV/JSON)
- Code splitting / performance optimization

### Lessons Learned
- Start with MVP; do not over-engineer the foundation
- Single project > monorepo for small teams
- Verify runtime behavior, not just type-checking
- Use `CLAUDE.md` to persist preferences across sessions
