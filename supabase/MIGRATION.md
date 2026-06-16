# Supabase setup & one-time data migration

This moves the app from the Hono/Better-Auth backend to **frontend-only + Supabase**,
and copies your existing single-user data across. Internal IDs are already UUIDs and
are preserved, so only `user_id` is remapped to your new Supabase Auth user.

> Money columns are `DECIMAL`; everything is copied verbatim. **Do not** replay any
> balance logic over the imported transactions — account balances are migrated as-is
> and already reflect history.

---

## 1. Create the Supabase project & schema

1. Create a project at https://supabase.com (region close to you).
2. In **SQL Editor**, run these three files in order (copy-paste each):
   - `supabase/migrations/20260616120001_schema.sql`
   - `supabase/migrations/20260616120002_rls.sql`
   - `supabase/migrations/20260616120003_functions.sql`
3. **Auth → Providers → Email**: turn **off** "Confirm email" (so you can sign in
   immediately — fine for a private family app). Email/password stays enabled.

## 2. Create your single login

1. **Authentication → Users → Add user** → enter your email + password → create.
2. Click the new user and copy its **User UID** (a UUID). Call it `NEW_UID`.
   The `profiles` row is created automatically by the `on_auth_user_created` trigger.

## 3. Point the frontend at Supabase

1. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
2. Create `.env` in the repo root (see `.env.example`):
   ```
   VITE_SUPABASE_URL=https://YOUR-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. `pnpm dev` → sign in with the user from step 2. The app should load (empty until
   the data is migrated). Also set the same two vars in the Vercel project's env.

## 4. Export your data from the local Docker DB

Make sure the old DB is up: `docker compose up -d`. Then dump the app tables
(data only, excluding the Better-Auth tables) — run from the repo root in PowerShell:

```powershell
# First, find your OLD user id (Better Auth text id):
docker exec financial-app-db psql -U postgres -d financial_app -t -c 'select id from \"user\";'

# Dump app-table data in FK-safe order:
docker exec financial-app-db pg_dump -U postgres -d financial_app `
  --data-only --no-owner --column-inserts `
  -t financial_account -t category -t transaction -t budget `
  -t portfolio -t holding -t investment_transaction -t loan -t exchange_rate `
  > data.sql
```

## 5. Remap the user id, then load into Supabase

Replace the old text user id with your `NEW_UID`. NULL `user_id` rows (shared system
categories) are left untouched because only the exact old id string is replaced.

```powershell
# Replace OLD_USER_ID and NEW_UID with the real values from steps 2 and 4:
(Get-Content data.sql) -replace 'OLD_USER_ID', 'NEW_UID' | Set-Content data.remapped.sql

# Load into Supabase. Use the connection string from
# Project Settings → Database → Connection string (URI), as the 'postgres' user
# (this role bypasses RLS, so the inserts go straight in):
psql "postgresql://postgres:[PASSWORD]@db.YOUR-ref.supabase.co:5432/postgres" -f data.remapped.sql
```

> No local `psql`? Open `data.remapped.sql`, copy its contents, and run them in the
> Supabase **SQL Editor** instead.

## 6. Verify

Run in the Supabase SQL Editor and compare against the old app:

```sql
select 'accounts' t, count(*) from financial_account
union all select 'transactions', count(*) from transaction
union all select 'categories', count(*) from category
union all select 'budgets', count(*) from budget
union all select 'loans', count(*) from loan
union all select 'portfolios', count(*) from portfolio
union all select 'holdings', count(*) from holding;

-- Spot-check account balances and loan rows look right:
select name, balance from financial_account order by name;
select name, principal, interest_rate, loan_term_months, start_date, payment_type from loan;
```

In the running app, confirm:
- Account balances match the old app exactly.
- Each loan's **paid-so-far / remaining** matches (these recompute from `start_date`).
- Dashboard net worth matches.

## 7. Finalize

Once everything checks out in production:
- Delete the now-unused backend: `server/`, `drizzle.config.ts`, `docker-compose.yml`,
  and the legacy deps (`hono`, `@hono/node-server`, `better-auth`,
  `@better-auth/drizzle-adapter`, `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`,
  `@neondatabase/serverless`, `ws`, `@types/ws`, `concurrently`, `tsx`, `dotenv`).
- Remove the `server` path from `tsconfig.json` `include` and the `@server/*` alias.
- Remove the `/api` rewrite exclusion in `vercel.json` (optional; harmless).
- Keep a `pg_dump` backup of the old DB until you're confident.
