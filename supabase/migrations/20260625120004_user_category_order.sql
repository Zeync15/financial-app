-- Per-user ordering of categories (including system defaults).
-- The base category.sort_order is the seeded fallback; user_category_order overrides it per user.

create table user_category_order (
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references category(id) on delete cascade,
  sort_order  integer not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, category_id)
);

create index user_category_order_user_id_idx on user_category_order(user_id);

alter table user_category_order enable row level security;

create policy uco_select on user_category_order for select
  using (user_id = auth.uid());
create policy uco_insert on user_category_order for insert
  with check (user_id = auth.uid());
create policy uco_update on user_category_order for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy uco_delete on user_category_order for delete
  using (user_id = auth.uid());
