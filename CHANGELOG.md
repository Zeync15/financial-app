# Changelog

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
