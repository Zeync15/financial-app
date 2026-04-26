import {
  pgTable,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  date,
  jsonb,
  pgEnum,
  uuid,
  serial,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';

// ─── Enums ──────────────────────────────────────────────────────────────────

export const accountTypeEnum = pgEnum('account_type', [
  'checking',
  'savings',
  'credit_card',
  'cash',
  'ewallet',
  'investment',
  'loan',
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'income',
  'expense',
  'transfer',
]);

export const categoryTypeEnum = pgEnum('category_type', [
  'income',
  'expense',
]);

export const budgetPeriodEnum = pgEnum('budget_period', [
  'weekly',
  'monthly',
  'yearly',
]);

export const investmentTypeEnum = pgEnum('investment_type', ['stock', 'etf']);

export const investmentTxTypeEnum = pgEnum('investment_tx_type', [
  'buy',
  'sell',
  'dividend',
]);

export const loanPaymentTypeEnum = pgEnum('loan_payment_type', [
  'fixed',
  'reducing_balance',
]);

// ─── Financial Account ──────────────────────────────────────────────────────

export const financialAccount = pgTable('financial_account', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: accountTypeEnum('type').notNull(),
  currency: text('currency').notNull().default('MYR'),
  institution: text('institution'),
  balance: decimal('balance', { precision: 19, scale: 4 })
    .notNull()
    .default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Category ───────────────────────────────────────────────────────────────

export const category = pgTable('category', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  type: categoryTypeEnum('type').notNull(),
  parentId: uuid('parent_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Transaction ────────────────────────────────────────────────────────────

export const transaction = pgTable('transaction', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => financialAccount.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => category.id),
  type: transactionTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 19, scale: 4 }).notNull(),
  description: text('description'),
  notes: text('notes'),
  date: date('date').notNull(),
  transferToId: uuid('transfer_to_id').references(() => financialAccount.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Budget ─────────────────────────────────────────────────────────────────

export const budget = pgTable('budget', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => category.id),
  name: text('name'),
  amount: decimal('amount', { precision: 19, scale: 4 }).notNull(),
  currency: text('currency').notNull().default('MYR'),
  period: budgetPeriodEnum('period').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Portfolio ──────────────────────────────────────────────────────────────

export const portfolio = pgTable('portfolio', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  currency: text('currency').notNull().default('MYR'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Holding ────────────────────────────────────────────────────────────────

export const holding = pgTable('holding', {
  id: uuid('id').defaultRandom().primaryKey(),
  portfolioId: uuid('portfolio_id')
    .notNull()
    .references(() => portfolio.id, { onDelete: 'cascade' }),
  symbol: text('symbol').notNull(),
  name: text('name'),
  type: investmentTypeEnum('type').notNull(),
  quantity: decimal('quantity', { precision: 19, scale: 6 }).notNull(),
  avgCostPrice: decimal('avg_cost_price', { precision: 19, scale: 4 }).notNull(),
  currency: text('currency').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Investment Transaction ─────────────────────────────────────────────────

export const investmentTransaction = pgTable('investment_transaction', {
  id: uuid('id').defaultRandom().primaryKey(),
  holdingId: uuid('holding_id')
    .notNull()
    .references(() => holding.id, { onDelete: 'cascade' }),
  type: investmentTxTypeEnum('type').notNull(),
  quantity: decimal('quantity', { precision: 19, scale: 6 }).notNull(),
  pricePerUnit: decimal('price_per_unit', { precision: 19, scale: 4 }).notNull(),
  fees: decimal('fees', { precision: 19, scale: 4 }).notNull().default('0'),
  date: date('date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Loan ───────────────────────────────────────────────────────────────────

export const loan = pgTable('loan', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => financialAccount.id),
  name: text('name').notNull(),
  principal: decimal('principal', { precision: 19, scale: 4 }).notNull(),
  currency: text('currency').notNull().default('MYR'),
  interestRate: decimal('interest_rate', { precision: 7, scale: 4 }).notNull(),
  loanTermMonths: integer('loan_term_months').notNull(),
  startDate: date('start_date').notNull(),
  paymentType: loanPaymentTypeEnum('payment_type').notNull(),
  monthlyPayment: decimal('monthly_payment', { precision: 19, scale: 4 }),
  extraInfo: jsonb('extra_info'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Exchange Rate ──────────────────────────────────────────────────────────

export const exchangeRate = pgTable('exchange_rate', {
  id: serial('id').primaryKey(),
  baseCurrency: text('base_currency').notNull(),
  targetCurrency: text('target_currency').notNull(),
  rate: decimal('rate', { precision: 19, scale: 8 }).notNull(),
  date: date('date').notNull(),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
});
