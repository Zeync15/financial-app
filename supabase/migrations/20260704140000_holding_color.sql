-- Per-holding display color, used for the allocation donut and holding avatar
-- on the Investments page. Nullable: existing holdings fall back to a hashed
-- palette color (by symbol) until the user assigns one via the color picker.
alter table holding add column if not exists color text;
