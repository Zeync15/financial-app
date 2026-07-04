-- Per-loan display color, used for the loan-allocation donut on the Loans page
-- and the loan card icon. Nullable: existing loans fall back to a palette color
-- until the user assigns one via the color picker in the loan form.
alter table loan add column if not exists color text;
