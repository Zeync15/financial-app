-- Loan adjustment events (reducing-balance loans).
--
-- A loan is otherwise a closed-form calculation. These effective-dated events
-- let the client re-simulate the amortization month-by-month:
--   extra_payment  → one-off lump sum on effective_date (reduces tenure)
--   payment_change → new monthly installment from effective_date
--   rate_change    → new annual % from effective_date (installment recomputed
--                     over the remaining tenure, Malaysian variable-rate style)
--
-- Pure data — no balance mutation — so no RPC is needed. RLS is scoped through
-- the parent loan's ownership (same pattern as transaction → financial_account).

create table loan_event (
  id             uuid primary key default gen_random_uuid(),
  loan_id        uuid not null references loan(id) on delete cascade,
  effective_date date not null,
  type           text not null check (type in ('extra_payment', 'payment_change', 'rate_change')),
  amount         numeric(19,4) not null,
  note           text,
  created_at     timestamptz not null default now()
);

create index loan_event_loan_id_idx on loan_event(loan_id, effective_date);

alter table loan_event enable row level security;

create policy loan_event_select on loan_event for select using (
  exists (select 1 from loan l where l.id = loan_event.loan_id and l.user_id = auth.uid())
);
create policy loan_event_insert on loan_event for insert with check (
  exists (select 1 from loan l where l.id = loan_event.loan_id and l.user_id = auth.uid())
);
create policy loan_event_update on loan_event for update using (
  exists (select 1 from loan l where l.id = loan_event.loan_id and l.user_id = auth.uid())
) with check (
  exists (select 1 from loan l where l.id = loan_event.loan_id and l.user_id = auth.uid())
);
create policy loan_event_delete on loan_event for delete using (
  exists (select 1 from loan l where l.id = loan_event.loan_id and l.user_id = auth.uid())
);
