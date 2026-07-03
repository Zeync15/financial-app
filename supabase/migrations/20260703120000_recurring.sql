-- Recurring transactions.
--
-- A `recurring_transaction` is a rule that posts a real `transaction` every
-- month on `day_of_month`, from `start_date` until `end_date` (null = forever).
-- There is no server scheduler: the client calls `run_due_recurring()` on app
-- open, which posts every occurrence whose due date is on/before today and
-- advances the `next_run_date` cursor. Because posting happens through the
-- existing `create_transaction` RPC, each posted row is an independent snapshot
-- and balances update atomically — editing a rule never rewrites past months.
--
-- Instalments are wired in as a source of recurring rows: creating an instalment
-- also inserts a linked recurring_transaction (source='instalment') so its
-- monthly payment posts like any other recurring expense.

-- ── recurring_transaction table ──────────────────────────────────────────────
create table recurring_transaction (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  account_id    uuid not null references financial_account(id) on delete cascade,
  category_id   uuid references category(id),
  type          transaction_type not null,
  amount        numeric(19,4) not null,
  description   text,
  notes         text,
  day_of_month  integer not null check (day_of_month between 1 and 31),
  start_date    date not null,
  end_date      date,
  next_run_date date not null,
  is_active     boolean not null default true,
  source        text not null default 'manual',
  instalment_id uuid references instalment(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index recurring_transaction_user_id_idx on recurring_transaction(user_id);
create index recurring_transaction_instalment_id_idx on recurring_transaction(instalment_id);

alter table recurring_transaction enable row level security;

create policy recurring_select on recurring_transaction for select
  using (user_id = auth.uid());
create policy recurring_insert on recurring_transaction for insert
  with check (user_id = auth.uid());
create policy recurring_update on recurring_transaction for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy recurring_delete on recurring_transaction for delete
  using (user_id = auth.uid());

-- ── instalment: gain a source account, category and payment day ──────────────
-- Nullable so pre-existing instalments stay valid; the app requires account +
-- payment_day for new instalments. Existing instalments with no account simply
-- have no linked recurring row and never post.
alter table instalment add column if not exists payment_day integer
  check (payment_day is null or payment_day between 1 and 31);
alter table instalment add column if not exists account_id uuid
  references financial_account(id);
alter table instalment add column if not exists category_id uuid
  references category(id);

-- ── helper: the occurrence date within a given month ─────────────────────────
-- Returns the date in the month of `p_month_anchor` whose day is `p_dom`,
-- clamped to the month's last day (so day 31 becomes Feb 28/29 without drifting
-- the underlying day_of_month).
create or replace function public.recurring_occurrence(p_month_anchor date, p_dom integer)
returns date
language sql
immutable
as $$
  select (date_trunc('month', p_month_anchor)::date)
       + (least(
           p_dom,
           extract(day from (date_trunc('month', p_month_anchor) + interval '1 month - 1 day'))::integer
         ) - 1);
$$;

-- ── run_due_recurring: post everything due, advance cursors ──────────────────
-- security invoker => RLS applies; only the caller's own rows and accounts are
-- visible. Reuses create_transaction for the atomic insert + balance update.
create or replace function public.run_due_recurring()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  r        recurring_transaction;
  v_next   date;
  v_posted integer := 0;
begin
  for r in
    select * from recurring_transaction
    where user_id = auth.uid() and is_active
  loop
    v_next := r.next_run_date;
    while v_next <= current_date
          and (r.end_date is null or v_next <= r.end_date)
    loop
      perform create_transaction(
        r.account_id, r.type, r.amount, v_next,
        r.category_id, r.description, r.notes, null
      );
      v_posted := v_posted + 1;
      -- Advance to the same day-of-month in the following month, clamped.
      v_next := recurring_occurrence(
        (date_trunc('month', v_next) + interval '1 month')::date,
        r.day_of_month
      );
    end loop;

    if v_next <> r.next_run_date then
      update recurring_transaction
        set next_run_date = v_next, updated_at = now()
      where id = r.id;
    end if;
  end loop;

  return v_posted;
end;
$$;

grant execute on function public.recurring_occurrence(date, integer) to authenticated;
grant execute on function public.run_due_recurring() to authenticated;
