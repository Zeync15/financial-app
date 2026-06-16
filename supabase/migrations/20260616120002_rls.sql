-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security — every table scoped to the signed-in user via auth.uid().
-- Required even with one user: the anon key is public, so RLS is the security
-- boundary. Child tables (transaction, holding, investment_transaction) have no
-- user_id and are scoped through their parent.
-- ─────────────────────────────────────────────────────────────────────────────

alter table profiles               enable row level security;
alter table financial_account      enable row level security;
alter table category               enable row level security;
alter table transaction            enable row level security;
alter table budget                 enable row level security;
alter table portfolio              enable row level security;
alter table holding                enable row level security;
alter table investment_transaction enable row level security;
alter table loan                   enable row level security;
alter table exchange_rate          enable row level security;

-- Profiles -------------------------------------------------------------------
create policy profiles_select on profiles for select using (id = auth.uid());
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Helper pattern for direct-user tables --------------------------------------
-- financial_account
create policy fa_select on financial_account for select using (user_id = auth.uid());
create policy fa_insert on financial_account for insert with check (user_id = auth.uid());
create policy fa_update on financial_account for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy fa_delete on financial_account for delete using (user_id = auth.uid());

-- category: own rows are read/write; system defaults (user_id IS NULL) are read-only & visible to all
create policy cat_select on category for select using (user_id = auth.uid() or user_id is null);
create policy cat_insert on category for insert with check (user_id = auth.uid());
create policy cat_update on category for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cat_delete on category for delete using (user_id = auth.uid());

-- budget
create policy budget_select on budget for select using (user_id = auth.uid());
create policy budget_insert on budget for insert with check (user_id = auth.uid());
create policy budget_update on budget for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy budget_delete on budget for delete using (user_id = auth.uid());

-- portfolio
create policy pf_select on portfolio for select using (user_id = auth.uid());
create policy pf_insert on portfolio for insert with check (user_id = auth.uid());
create policy pf_update on portfolio for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pf_delete on portfolio for delete using (user_id = auth.uid());

-- loan
create policy loan_select on loan for select using (user_id = auth.uid());
create policy loan_insert on loan for insert with check (user_id = auth.uid());
create policy loan_update on loan for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy loan_delete on loan for delete using (user_id = auth.uid());

-- Child tables scoped through their parent -----------------------------------
-- transaction → financial_account (both account_id and transfer_to_id must be owned)
create policy tx_select on transaction for select using (
  exists (select 1 from financial_account a where a.id = transaction.account_id and a.user_id = auth.uid())
);
create policy tx_insert on transaction for insert with check (
  exists (select 1 from financial_account a where a.id = transaction.account_id and a.user_id = auth.uid())
);
create policy tx_update on transaction for update using (
  exists (select 1 from financial_account a where a.id = transaction.account_id and a.user_id = auth.uid())
) with check (
  exists (select 1 from financial_account a where a.id = transaction.account_id and a.user_id = auth.uid())
);
create policy tx_delete on transaction for delete using (
  exists (select 1 from financial_account a where a.id = transaction.account_id and a.user_id = auth.uid())
);

-- holding → portfolio
create policy holding_select on holding for select using (
  exists (select 1 from portfolio p where p.id = holding.portfolio_id and p.user_id = auth.uid())
);
create policy holding_insert on holding for insert with check (
  exists (select 1 from portfolio p where p.id = holding.portfolio_id and p.user_id = auth.uid())
);
create policy holding_update on holding for update using (
  exists (select 1 from portfolio p where p.id = holding.portfolio_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from portfolio p where p.id = holding.portfolio_id and p.user_id = auth.uid())
);
create policy holding_delete on holding for delete using (
  exists (select 1 from portfolio p where p.id = holding.portfolio_id and p.user_id = auth.uid())
);

-- investment_transaction → holding → portfolio
create policy itx_select on investment_transaction for select using (
  exists (
    select 1 from holding h join portfolio p on p.id = h.portfolio_id
    where h.id = investment_transaction.holding_id and p.user_id = auth.uid()
  )
);
create policy itx_insert on investment_transaction for insert with check (
  exists (
    select 1 from holding h join portfolio p on p.id = h.portfolio_id
    where h.id = investment_transaction.holding_id and p.user_id = auth.uid()
  )
);
create policy itx_update on investment_transaction for update using (
  exists (
    select 1 from holding h join portfolio p on p.id = h.portfolio_id
    where h.id = investment_transaction.holding_id and p.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from holding h join portfolio p on p.id = h.portfolio_id
    where h.id = investment_transaction.holding_id and p.user_id = auth.uid()
  )
);
create policy itx_delete on investment_transaction for delete using (
  exists (
    select 1 from holding h join portfolio p on p.id = h.portfolio_id
    where h.id = investment_transaction.holding_id and p.user_id = auth.uid()
  )
);

-- exchange_rate: shared reference data, readable by any authenticated user.
create policy er_select on exchange_rate for select to authenticated using (true);
