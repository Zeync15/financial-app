-- Retirement page: details and dividend history for accounts of type
-- 'retirement' (EPF/KWSP, PRS). Needs 20261125130000_account_types.sql first.
--
-- The balance stays on financial_account. Saving the form can set it (the
-- three EPF accounts' total, or a PRS balance), so that save goes through
-- save_retirement_account below: the details and the balance change together
-- or not at all.

-- One row per retirement account ---------------------------------------------
create table retirement_plan (
  account_id     uuid primary key references financial_account(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  scheme         text not null default 'epf' check (scheme in ('epf', 'prs', 'other')),
  birth_date     date,
  -- Off while not working: nothing goes in, the projection grows from dividends only.
  contributing   boolean not null default true,
  monthly_salary numeric(19,4),
  employee_rate  numeric(6,3) not null default 11,
  employer_rate  numeric(6,3) not null default 13,
  -- PRS / other: a fixed top-up each month instead of a share of salary.
  monthly_amount numeric(19,4),
  -- Null: the projection uses the average of the dividend history.
  own_rate       numeric(6,3),
  -- EPF's three accounts as copied from the KWSP app. Null: estimated 75/15/10.
  persaraan      numeric(19,4),
  sejahtera      numeric(19,4),
  fleksibel      numeric(19,4),
  -- When the balance was last copied from the statement.
  balance_as_of  date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index retirement_plan_user_id_idx on retirement_plan(user_id);

alter table retirement_plan enable row level security;

create policy rp_select on retirement_plan for select
  using (user_id = auth.uid());
create policy rp_insert on retirement_plan for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from financial_account a where a.id = account_id and a.user_id = auth.uid())
  );
create policy rp_update on retirement_plan for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from financial_account a where a.id = account_id and a.user_id = auth.uid())
  );
create policy rp_delete on retirement_plan for delete
  using (user_id = auth.uid());

-- Dividends (EPF) or yearly returns (PRS), one row per year -----------------
create table retirement_dividend (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references financial_account(id) on delete cascade,
  year       integer not null check (year between 1950 and 2200),
  rate       numeric(6,3) not null,
  -- What was credited that year; optional.
  amount     numeric(19,4),
  created_at timestamptz not null default now(),
  unique (account_id, year)
);

create index retirement_dividend_user_id_idx on retirement_dividend(user_id);

alter table retirement_dividend enable row level security;

create policy rd_select on retirement_dividend for select
  using (user_id = auth.uid());
create policy rd_insert on retirement_dividend for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from financial_account a where a.id = account_id and a.user_id = auth.uid())
  );
create policy rd_update on retirement_dividend for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from financial_account a where a.id = account_id and a.user_id = auth.uid())
  );
create policy rd_delete on retirement_dividend for delete
  using (user_id = auth.uid());

-- Save a retirement account's details, and its balance when given ----------
-- p_account_id null: creates the account (type retirement) first.
-- p_balance null: leaves the balance as it is (and keeps the old as-of date).
-- SECURITY INVOKER, so RLS applies to every statement.
create or replace function public.save_retirement_account(
  p_account_id    uuid,
  p_name          text,
  p_balance       numeric,
  p_balance_as_of date,
  p_plan          jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid := p_account_id;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  if v_id is null then
    if coalesce(trim(p_name), '') = '' then
      raise exception 'Name is required';
    end if;
    insert into financial_account (user_id, name, type, currency, balance)
    values (v_uid, trim(p_name), 'retirement', 'MYR', coalesce(p_balance, 0))
    returning id into v_id;
  else
    if not exists (
      select 1 from financial_account
      where id = v_id and user_id = v_uid and type = 'retirement'
    ) then
      raise exception 'Retirement account not found' using errcode = 'no_data_found';
    end if;
    if p_balance is not null then
      update financial_account
      set balance = p_balance, updated_at = now()
      where id = v_id;
    end if;
  end if;

  insert into retirement_plan (
    account_id, user_id, scheme, birth_date, contributing, monthly_salary,
    employee_rate, employer_rate, monthly_amount, own_rate,
    persaraan, sejahtera, fleksibel, balance_as_of, updated_at
  ) values (
    v_id, v_uid,
    coalesce(p_plan->>'scheme', 'epf'),
    nullif(p_plan->>'birthDate', '')::date,
    coalesce((p_plan->>'contributing')::boolean, true),
    nullif(p_plan->>'monthlySalary', '')::numeric,
    coalesce(nullif(p_plan->>'employeeRate', '')::numeric, 11),
    coalesce(nullif(p_plan->>'employerRate', '')::numeric, 13),
    nullif(p_plan->>'monthlyAmount', '')::numeric,
    nullif(p_plan->>'ownRate', '')::numeric,
    nullif(p_plan->>'persaraan', '')::numeric,
    nullif(p_plan->>'sejahtera', '')::numeric,
    nullif(p_plan->>'fleksibel', '')::numeric,
    case when p_balance is not null then coalesce(p_balance_as_of, current_date) end,
    now()
  )
  on conflict (account_id) do update set
    scheme         = excluded.scheme,
    birth_date     = excluded.birth_date,
    contributing   = excluded.contributing,
    monthly_salary = excluded.monthly_salary,
    employee_rate  = excluded.employee_rate,
    employer_rate  = excluded.employer_rate,
    monthly_amount = excluded.monthly_amount,
    own_rate       = excluded.own_rate,
    persaraan      = excluded.persaraan,
    sejahtera      = excluded.sejahtera,
    fleksibel      = excluded.fleksibel,
    balance_as_of  = coalesce(excluded.balance_as_of, retirement_plan.balance_as_of),
    updated_at     = now();

  return v_id;
end;
$$;
