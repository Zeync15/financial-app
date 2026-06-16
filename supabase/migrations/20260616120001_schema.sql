-- ─────────────────────────────────────────────────────────────────────────────
-- Financial App — schema (ported from Drizzle server/schema/app.ts)
-- Key change vs the old backend: user_id is now uuid referencing auth.users(id)
-- instead of the Better Auth `user` table. A `profiles` table holds what used to
-- live on the user row (base_currency, display name).
-- ─────────────────────────────────────────────────────────────────────────────

-- Enums ----------------------------------------------------------------------
create type account_type as enum (
  'checking', 'savings', 'credit_card', 'cash', 'ewallet', 'investment', 'loan'
);
create type transaction_type as enum ('income', 'expense', 'transfer');
create type category_type as enum ('income', 'expense');
create type budget_period as enum ('weekly', 'monthly', 'yearly');
create type investment_type as enum ('stock', 'etf');
create type investment_tx_type as enum ('buy', 'sell', 'dividend');
create type loan_payment_type as enum ('fixed', 'reducing_balance');

-- Profiles (replaces Better Auth `user` row extras) --------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  base_currency text not null default 'MYR',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Financial Account ----------------------------------------------------------
create table financial_account (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        account_type not null,
  currency    text not null default 'MYR',
  institution text,
  balance     numeric(19,4) not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index financial_account_user_id_idx on financial_account(user_id);

-- Category (user_id NULL = shared system default) ----------------------------
create table category (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  name       text not null,
  icon       text,
  color      text,
  type       category_type not null,
  parent_id  uuid,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index category_user_id_idx on category(user_id);

-- Transaction ----------------------------------------------------------------
create table transaction (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references financial_account(id) on delete cascade,
  category_id    uuid references category(id),
  type           transaction_type not null,
  amount         numeric(19,4) not null,
  description    text,
  notes          text,
  date           date not null,
  transfer_to_id uuid references financial_account(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index transaction_account_id_idx on transaction(account_id);
create index transaction_date_idx on transaction(date);

-- Budget ---------------------------------------------------------------------
create table budget (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references category(id),
  name        text,
  amount      numeric(19,4) not null,
  currency    text not null default 'MYR',
  period      budget_period not null,
  start_date  date not null,
  end_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index budget_user_id_idx on budget(user_id);

-- Portfolio ------------------------------------------------------------------
create table portfolio (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  currency   text not null default 'MYR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index portfolio_user_id_idx on portfolio(user_id);

-- Holding --------------------------------------------------------------------
create table holding (
  id             uuid primary key default gen_random_uuid(),
  portfolio_id   uuid not null references portfolio(id) on delete cascade,
  symbol         text not null,
  name           text,
  type           investment_type not null,
  quantity       numeric(19,6) not null,
  avg_cost_price numeric(19,4) not null,
  currency       text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index holding_portfolio_id_idx on holding(portfolio_id);

-- Investment Transaction -----------------------------------------------------
create table investment_transaction (
  id             uuid primary key default gen_random_uuid(),
  holding_id     uuid not null references holding(id) on delete cascade,
  type           investment_tx_type not null,
  quantity       numeric(19,6) not null,
  price_per_unit numeric(19,4) not null,
  fees           numeric(19,4) not null default 0,
  date           date not null,
  notes          text,
  created_at     timestamptz not null default now()
);
create index investment_transaction_holding_id_idx on investment_transaction(holding_id);

-- Loan -----------------------------------------------------------------------
create table loan (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  account_id       uuid references financial_account(id),
  name             text not null,
  principal        numeric(19,4) not null,
  currency         text not null default 'MYR',
  interest_rate    numeric(7,4) not null,
  loan_term_months integer not null,
  start_date       date not null,
  payment_type     loan_payment_type not null,
  monthly_payment  numeric(19,4),
  extra_info       jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index loan_user_id_idx on loan(user_id);

-- Exchange Rate (shared, no user scoping) ------------------------------------
create table exchange_rate (
  id             serial primary key,
  base_currency  text not null,
  target_currency text not null,
  rate           numeric(19,8) not null,
  date           date not null,
  fetched_at     timestamptz not null default now()
);
