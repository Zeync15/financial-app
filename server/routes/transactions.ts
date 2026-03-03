import { Hono } from 'hono';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { transaction, financialAccount, category } from '../schema/app';
import { requireAuth } from '../middleware';
import type { AppEnv } from '../types';

export const transactionRoutes = new Hono<AppEnv>();
transactionRoutes.use(requireAuth);

// List transactions (with optional filters)
transactionRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const accountId = c.req.query('accountId');
  const from = c.req.query('from');
  const to = c.req.query('to');

  // Get user's account IDs first
  const userAccounts = await db
    .select({ id: financialAccount.id })
    .from(financialAccount)
    .where(eq(financialAccount.userId, user.id));
  const accountIds = userAccounts.map((a) => a.id);

  if (accountIds.length === 0) return c.json([]);

  let query = db
    .select({
      id: transaction.id,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      notes: transaction.notes,
      date: transaction.date,
      transferToId: transaction.transferToId,
      createdAt: transaction.createdAt,
      categoryName: category.name,
      categoryColor: category.color,
      accountName: financialAccount.name,
    })
    .from(transaction)
    .leftJoin(category, eq(transaction.categoryId, category.id))
    .leftJoin(financialAccount, eq(transaction.accountId, financialAccount.id))
    .where(
      and(
        sql`${transaction.accountId} IN ${accountIds}`,
        accountId ? eq(transaction.accountId, accountId) : undefined,
        from ? gte(transaction.date, from) : undefined,
        to ? lte(transaction.date, to) : undefined,
      ),
    )
    .orderBy(desc(transaction.date), desc(transaction.createdAt))
    .limit(200);

  const rows = await query;
  return c.json(rows);
});

// Create transaction
transactionRoutes.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();

  // Verify account belongs to user
  const [acc] = await db
    .select()
    .from(financialAccount)
    .where(and(eq(financialAccount.id, body.accountId), eq(financialAccount.userId, user.id)));
  if (!acc) return c.json({ error: 'Account not found' }, 404);

  const [tx] = await db
    .insert(transaction)
    .values({
      accountId: body.accountId,
      categoryId: body.categoryId || null,
      type: body.type,
      amount: body.amount,
      description: body.description || null,
      notes: body.notes || null,
      date: body.date,
      transferToId: body.transferToId || null,
    })
    .returning();

  // Update account balance
  const balanceChange =
    body.type === 'income'
      ? Number(body.amount)
      : body.type === 'expense'
        ? -Number(body.amount)
        : -Number(body.amount); // transfer out

  await db
    .update(financialAccount)
    .set({
      balance: sql`${financialAccount.balance} + ${balanceChange}`,
      updatedAt: new Date(),
    })
    .where(eq(financialAccount.id, body.accountId));

  // If transfer, credit the target account
  if (body.type === 'transfer' && body.transferToId) {
    await db
      .update(financialAccount)
      .set({
        balance: sql`${financialAccount.balance} + ${Number(body.amount)}`,
        updatedAt: new Date(),
      })
      .where(eq(financialAccount.id, body.transferToId));
  }

  return c.json(tx, 201);
});

// Delete transaction
transactionRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');

  // Get the transaction and verify ownership
  const [tx] = await db.select().from(transaction).where(eq(transaction.id, id));
  if (!tx) return c.json({ error: 'Not found' }, 404);

  const [acc] = await db
    .select()
    .from(financialAccount)
    .where(and(eq(financialAccount.id, tx.accountId), eq(financialAccount.userId, user.id)));
  if (!acc) return c.json({ error: 'Not found' }, 404);

  // Reverse the balance change
  const reversal =
    tx.type === 'income'
      ? -Number(tx.amount)
      : tx.type === 'expense'
        ? Number(tx.amount)
        : Number(tx.amount);

  await db
    .update(financialAccount)
    .set({
      balance: sql`${financialAccount.balance} + ${reversal}`,
      updatedAt: new Date(),
    })
    .where(eq(financialAccount.id, tx.accountId));

  if (tx.type === 'transfer' && tx.transferToId) {
    await db
      .update(financialAccount)
      .set({
        balance: sql`${financialAccount.balance} - ${Number(tx.amount)}`,
        updatedAt: new Date(),
      })
      .where(eq(financialAccount.id, tx.transferToId));
  }

  await db.delete(transaction).where(eq(transaction.id, id));
  return c.json({ success: true });
});
