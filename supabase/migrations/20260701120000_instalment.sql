-- Instalment plans (e.g. hire purchase / "buy now pay later"). Mirrors the
-- `loan` table but has no payment_type — instalments are always flat-rate
-- (Malaysian Hire Purchase style), so the app computes them with the "fixed"
-- branch of loanCalculations.

create table instalment (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  principal        numeric(19,4) not null,
  currency         text not null default 'MYR',
  interest_rate    numeric(7,4) not null,
  loan_term_months integer not null,
  start_date       date not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index instalment_user_id_idx on instalment(user_id);

alter table instalment enable row level security;

create policy instalment_select on instalment for select
  using (user_id = auth.uid());
create policy instalment_insert on instalment for insert
  with check (user_id = auth.uid());
create policy instalment_update on instalment for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy instalment_delete on instalment for delete
  using (user_id = auth.uid());
