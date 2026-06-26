-- ─────────────────────────────────────────────────────────────────────────────
-- Investment pricing — store the latest market price per holding so the UI can
-- show market value + gain/loss. US (USD) holdings are auto-filled from a market
-- data API (Finnhub) client-side; non-USD holdings (e.g. Bursa Malaysia REITs)
-- are entered manually since no free browser API covers those exchanges.
-- No RLS change needed: holding's existing policies already gate all columns.
-- ─────────────────────────────────────────────────────────────────────────────

alter table holding add column current_price   numeric(19,4);
alter table holding add column price_updated_at timestamptz;
