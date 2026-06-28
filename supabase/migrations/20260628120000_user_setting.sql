-- Per-user key/value settings (e.g. net_monthly_income for the DSR calculation).
-- value is stored as text and parsed on the app side, so the same table works
-- for numbers, JSON blobs, flags, etc.

create table user_setting (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      text,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create index user_setting_user_id_idx on user_setting(user_id);

alter table user_setting enable row level security;

create policy us_select on user_setting for select
  using (user_id = auth.uid());
create policy us_insert on user_setting for insert
  with check (user_id = auth.uid());
create policy us_update on user_setting for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy us_delete on user_setting for delete
  using (user_id = auth.uid());
