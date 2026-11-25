-- More account types, each with its own emoji and Dashboard group:
--   foreign_currency  Banking & Cash (Wise, BigPay, USD/SGD savings)
--   fixed_deposit     Investments
--   unit_trust        Investments (ASB, ASN, other unit trusts)
--   tabung_haji       Investments
--   gold              Investments (gold accounts, Public Gold)
--   retirement        Retirement (EPF/KWSP, PRS)
--   receivable        Owed to you (money lent out)
-- All are assets. Run each line on its own if your SQL editor wraps the script
-- in a transaction and complains.
alter type account_type add value if not exists 'foreign_currency';
alter type account_type add value if not exists 'fixed_deposit';
alter type account_type add value if not exists 'unit_trust';
alter type account_type add value if not exists 'tabung_haji';
alter type account_type add value if not exists 'gold';
alter type account_type add value if not exists 'retirement';
alter type account_type add value if not exists 'receivable';
