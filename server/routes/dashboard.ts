import { Hono } from 'hono';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { db } from '../db.js';
import { financialAccount, transaction, loan } from '../schema/app.js';
import { requireAuth } from '../middleware.js';
import type { AppEnv } from '../types.js';

export const dashboardRoutes = new Hono<AppEnv>();
dashboardRoutes.use(requireAuth);

dashboardRoutes.get('/', async (c) => {
  const user = c.get('user')!;

  // Get all accounts
  const accounts = await db
    .select()
    .from(financialAccount)
    .where(and(eq(financialAccount.userId, user.id), eq(financialAccount.isActive, true)));

  // Calculate totals
  const totalAssets = accounts
    .filter((a) => a.type !== 'credit_card' && a.type !== 'loan')
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const totalLiabilities = accounts
    .filter((a) => a.type === 'credit_card' || a.type === 'loan')
    .reduce((sum, a) => sum + Math.abs(Number(a.balance)), 0);

  // Get loan balances
  const loans = await db
    .select()
    .from(loan)
    .where(eq(loan.userId, user.id));
  const totalLoanBalance = loans.reduce((sum, l) => sum + Number(l.principal), 0);

  const netWorth = totalAssets - totalLiabilities - totalLoanBalance;

  // Monthly income/expense (current month)
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]!;

  const accountIds = accounts.map((a) => a.id);

  let monthlyIncome = 0;
  let monthlyExpense = 0;

  if (accountIds.length > 0) {
    const [incomeResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${transaction.amount}), 0)` })
      .from(transaction)
      .where(
        and(
          sql`${transaction.accountId} IN ${accountIds}`,
          eq(transaction.type, 'income'),
          gte(transaction.date, monthStart),
          lte(transaction.date, monthEnd),
        ),
      );

    const [expenseResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${transaction.amount}), 0)` })
      .from(transaction)
      .where(
        and(
          sql`${transaction.accountId} IN ${accountIds}`,
          eq(transaction.type, 'expense'),
          gte(transaction.date, monthStart),
          lte(transaction.date, monthEnd),
        ),
      );

    monthlyIncome = Number(incomeResult?.total || 0);
    monthlyExpense = Number(expenseResult?.total || 0);
  }

  return c.json({
    netWorth,
    totalAssets,
    totalLiabilities: totalLiabilities + totalLoanBalance,
    monthlyIncome,
    monthlyExpense,
    accountCount: accounts.length,
    loanCount: loans.length,
  });
});
