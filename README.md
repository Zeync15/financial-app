# Financial App

Personal financial management app built for private family use.

## Features

1. **Net Worth Dashboard** - aggregated view of all assets and liabilities
2. **Expense Tracking** - log income, expenses, and transfers with categories
3. **Personal Budgets** - set monthly/weekly/yearly budgets per category with progress tracking
4. **Investment Portfolio** - track stocks and ETFs across multiple portfolios
5. **Loan Management** - track loans with amortization schedule calculator

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, React Router 7 |
| UI | Ant Design 6, Tailwind CSS 4 |
| Backend | Hono (TypeScript) |
| Database | PostgreSQL 16, Drizzle ORM |
| Auth | Better Auth (email/password) |

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm
- Docker (for PostgreSQL)

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd financial-app
pnpm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Create .env from template
cp .env.example .env
# Edit .env and set a random BETTER_AUTH_SECRET

# 4. Push database schema
pnpm db:push

# 5. Start dev servers
pnpm dev
```

Open http://localhost:5173 - register an account and start using the app.

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite + Hono dev servers |
| `pnpm build` | Build frontend for production |
| `pnpm start` | Run production server |
| `pnpm db:push` | Push schema to database |
| `pnpm db:generate` | Generate migration files |
| `pnpm db:migrate` | Run migrations |

## Project Structure

```
financial-app/
├── server/                 # Hono backend
│   ├── index.ts            # Server entry point
│   ├── auth.ts             # Better Auth config
│   ├── db.ts               # Drizzle connection
│   ├── middleware.ts        # Session + auth middleware
│   ├── types.ts            # Shared Hono env types
│   ├── schema/             # Drizzle table definitions
│   │   ├── auth.ts         # User, session, account, verification
│   │   └── app.ts          # Financial tables
│   └── routes/             # API route handlers
│       ├── accounts.ts     # Financial account CRUD
│       ├── transactions.ts # Transaction CRUD
│       ├── budgets.ts      # Budget CRUD + categories
│       ├── portfolios.ts   # Portfolio + holding CRUD
│       ├── loans.ts        # Loan CRUD + amortization
│       └── dashboard.ts    # Net worth aggregation
├── src/                    # React frontend
│   ├── main.tsx            # Entry point
│   ├── App.tsx             # Router + auth guards
│   ├── lib/
│   │   ├── api.ts          # HTTP client
│   │   └── auth-client.ts  # Better Auth React client
│   ├── components/
│   │   └── layouts/
│   │       └── DashboardLayout.tsx
│   └── pages/
│       ├── Login.tsx
│       ├── Register.tsx
│       ├── Dashboard.tsx
│       ├── Accounts.tsx
│       ├── Transactions.tsx
│       ├── Budgets.tsx
│       ├── Investments.tsx
│       └── Loans.tsx
├── docker-compose.yml      # PostgreSQL
├── vite.config.ts
├── drizzle.config.ts
└── tsconfig.json
```

## Security Model

- Session-based auth with HTTP-only cookies
- All API routes require authentication
- All database queries scoped to the authenticated user's ID
- No user can access another user's data
- Designed for private network deployment (no public internet exposure needed)
