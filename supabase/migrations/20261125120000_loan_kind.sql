-- What the loan is for (house, car, motorcycle, personal, education, other),
-- picked in the loan form and shown as the loan's emoji on the Loans page and
-- the Dashboard. Nullable: existing loans show the generic loan emoji until
-- one is picked. The app owns the list of values, so there is no check here.
alter table loan add column if not exists kind text;
