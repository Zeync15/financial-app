-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic balance mutations (ported from server/routes/transactions.ts).
-- plpgsql functions run inside a single transaction, so multi-step balance
-- updates either all succeed or all roll back — no partial writes.
--
-- SECURITY INVOKER: RLS applies to every statement, so a user can only touch
-- their own accounts/transactions. Ownership is also asserted explicitly so a
-- bad id raises instead of silently no-op'ing.
--
-- Sign rule (applyAmount): income => +amount, expense/transfer => -amount.
-- ─────────────────────────────────────────────────────────────────────────────

-- Create -----------------------------------------------------------------------
create or replace function public.create_transaction(
  p_account_id     uuid,
  p_type           transaction_type,
  p_amount         numeric,
  p_date           date,
  p_category_id    uuid default null,
  p_description    text default null,
  p_notes          text default null,
  p_transfer_to_id uuid default null
) returns transaction
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tx     transaction;
  v_change numeric;
begin
  -- RLS makes only owned accounts visible; missing => not owned or nonexistent.
  if not exists (select 1 from financial_account where id = p_account_id) then
    raise exception 'Account not found' using errcode = 'no_data_found';
  end if;
  if p_type = 'transfer' and p_transfer_to_id is not null
     and not exists (select 1 from financial_account where id = p_transfer_to_id) then
    raise exception 'Transfer destination not found' using errcode = 'no_data_found';
  end if;

  insert into transaction
    (account_id, category_id, type, amount, description, notes, date, transfer_to_id)
  values
    (p_account_id, p_category_id, p_type, p_amount, p_description, p_notes, p_date, p_transfer_to_id)
  returning * into v_tx;

  v_change := case when p_type = 'income' then p_amount else -p_amount end;
  update financial_account set balance = balance + v_change, updated_at = now()
  where id = p_account_id;

  if p_type = 'transfer' and p_transfer_to_id is not null then
    update financial_account set balance = balance + p_amount, updated_at = now()
    where id = p_transfer_to_id;
  end if;

  return v_tx;
end;
$$;

-- Update -----------------------------------------------------------------------
create or replace function public.update_transaction(
  p_id             uuid,
  p_account_id     uuid,
  p_type           transaction_type,
  p_amount         numeric,
  p_date           date,
  p_category_id    uuid default null,
  p_description    text default null,
  p_notes          text default null,
  p_transfer_to_id uuid default null
) returns transaction
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old    transaction;
  v_tx     transaction;
  v_change numeric;
begin
  select * into v_old from transaction where id = p_id;   -- RLS: owned via account
  if not found then
    raise exception 'Not found' using errcode = 'no_data_found';
  end if;

  if not exists (select 1 from financial_account where id = p_account_id) then
    raise exception 'Account not found' using errcode = 'no_data_found';
  end if;
  if p_type = 'transfer' and p_transfer_to_id is not null
     and not exists (select 1 from financial_account where id = p_transfer_to_id) then
    raise exception 'Transfer destination not found' using errcode = 'no_data_found';
  end if;

  -- Reverse old effect
  update financial_account
    set balance = balance + (case when v_old.type = 'income' then -v_old.amount else v_old.amount end),
        updated_at = now()
  where id = v_old.account_id;
  if v_old.type = 'transfer' and v_old.transfer_to_id is not null then
    update financial_account set balance = balance - v_old.amount, updated_at = now()
    where id = v_old.transfer_to_id;
  end if;

  -- Apply new effect
  v_change := case when p_type = 'income' then p_amount else -p_amount end;
  update financial_account set balance = balance + v_change, updated_at = now()
  where id = p_account_id;
  if p_type = 'transfer' and p_transfer_to_id is not null then
    update financial_account set balance = balance + p_amount, updated_at = now()
    where id = p_transfer_to_id;
  end if;

  update transaction set
    account_id     = p_account_id,
    category_id    = p_category_id,
    type           = p_type,
    amount         = p_amount,
    description    = p_description,
    notes          = p_notes,
    date           = p_date,
    transfer_to_id = p_transfer_to_id,
    updated_at     = now()
  where id = p_id
  returning * into v_tx;

  return v_tx;
end;
$$;

-- Delete -----------------------------------------------------------------------
create or replace function public.delete_transaction(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old transaction;
begin
  select * into v_old from transaction where id = p_id;   -- RLS: owned via account
  if not found then
    raise exception 'Not found' using errcode = 'no_data_found';
  end if;

  update financial_account
    set balance = balance + (case when v_old.type = 'income' then -v_old.amount else v_old.amount end),
        updated_at = now()
  where id = v_old.account_id;
  if v_old.type = 'transfer' and v_old.transfer_to_id is not null then
    update financial_account set balance = balance - v_old.amount, updated_at = now()
    where id = v_old.transfer_to_id;
  end if;

  delete from transaction where id = p_id;
end;
$$;

grant execute on function public.create_transaction(uuid, transaction_type, numeric, date, uuid, text, text, uuid) to authenticated;
grant execute on function public.update_transaction(uuid, uuid, transaction_type, numeric, date, uuid, text, text, uuid) to authenticated;
grant execute on function public.delete_transaction(uuid) to authenticated;
