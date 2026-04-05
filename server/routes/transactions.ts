import { Hono } from 'hono';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { transaction, financialAccount, category } from '../schema/app';
import { requireAuth } from '../middleware';
import type { AppEnv } from '../types';

export const transactionRoutes = new Hono<AppEnv>();
transactionRoutes.use(requireAuth);

// +amount for income, -amount for expense/transfer (deducts from source)
function applyAmount(type: string, amount: number) {
  return type === 'income' ? amount : -amount;
}

// List transactions (with optional filters)
transactionRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const accountId = c.req.query('accountId');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const userAccounts = await db
    .select({ id: financialAccount.id })
    .from(financialAccount)
    .where(eq(financialAccount.userId, user.id));
  const accountIds = userAccounts.map((a) => a.id);

  if (accountIds.length === 0) return c.json([]);

  const rows = await db
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

  return c.json(rows);
});

// Create transaction
transactionRoutes.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();

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

  const change = applyAmount(body.type, Number(body.amount));
  await db
    .update(financialAccount)
    .set({ balance: sql`${financialAccount.balance} + ${change}`, updatedAt: new Date() })
    .where(eq(financialAccount.id, body.accountId));

  if (body.type === 'transfer' && body.transferToId) {
    await db
      .update(financialAccount)
      .set({ balance: sql`${financialAccount.balance} + ${Number(body.amount)}`, updatedAt: new Date() })
      .where(eq(financialAccount.id, body.transferToId));
  }

  return c.json(tx, 201);
});

// Update transaction
transactionRoutes.put('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const body = await c.req.json();

  const [oldTx] = await db.select().from(transaction).where(eq(transaction.id, id));
  if (!oldTx) return c.json({ error: 'Not found' }, 404);

  // Verify both accounts belong to this user in parallel
  const [oldAcc, newAcc] = await Promise.all([
    db.select().from(financialAccount)
      .where(and(eq(financialAccount.id, oldTx.accountId), eq(financialAccount.userId, user.id)))
      .then((r) => r[0]),
    db.select().from(financialAccount)
      .where(and(eq(financialAccount.id, body.accountId), eq(financialAccount.userId, user.id)))
      .then((r) => r[0]),
  ]);
  if (!oldAcc) return c.json({ error: 'Not found' }, 404);
  if (!newAcc) return c.json({ error: 'Account not found' }, 404);

  const updated = await db.transaction(async (tx) => {
    // Reverse old balance changes
    const reversal = -applyAmount(oldTx.type, Number(oldTx.amount));
    await tx
      .update(financialAccount)
      .set({ balance: sql`${financialAccount.balance} + ${reversal}`, updatedAt: new Date() })
      .where(eq(financialAccount.id, oldTx.accountId));

    if (oldTx.type === 'transfer' && oldTx.transferToId) {
      await tx
        .update(financialAccount)
        .set({ balance: sql`${financialAccount.balance} - ${Number(oldTx.amount)}`, updatedAt: new Date() })
        .where(eq(financialAccount.id, oldTx.transferToId));
    }

    // Apply new balance changes
    const change = applyAmount(body.type, Number(body.amount));
    await tx
      .update(financialAccount)
      .set({ balance: sql`${financialAccount.balance} + ${change}`, updatedAt: new Date() })
      .where(eq(financialAccount.id, body.accountId));

    if (body.type === 'transfer' && body.transferToId) {
      await tx
        .update(financialAccount)
        .set({ balance: sql`${financialAccount.balance} + ${Number(body.amount)}`, updatedAt: new Date() })
        .where(eq(financialAccount.id, body.transferToId));
    }

    const [row] = await tx
      .update(transaction)
      .set({
        accountId: body.accountId,
        categoryId: body.categoryId || null,
        type: body.type,
        amount: body.amount,
        description: body.description || null,
        notes: body.notes || null,
        date: body.date,
        transferToId: body.transferToId || null,
        updatedAt: new Date(),
      })
      .where(eq(transaction.id, id))
      .returning();

    return row;
  });

  return c.json(updated);
});

// Delete transaction
transactionRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');

  const [tx] = await db.select().from(transaction).where(eq(transaction.id, id));
  if (!tx) return c.json({ error: 'Not found' }, 404);

  const [acc] = await db
    .select()
    .from(financialAccount)
    .where(and(eq(financialAccount.id, tx.accountId), eq(financialAccount.userId, user.id)));
  if (!acc) return c.json({ error: 'Not found' }, 404);

  await db.transaction(async (dtx) => {
    const reversal = -applyAmount(tx.type, Number(tx.amount));
    await dtx
      .update(financialAccount)
      .set({ balance: sql`${financialAccount.balance} + ${reversal}`, updatedAt: new Date() })
      .where(eq(financialAccount.id, tx.accountId));

    if (tx.type === 'transfer' && tx.transferToId) {
      await dtx
        .update(financialAccount)
        .set({ balance: sql`${financialAccount.balance} - ${Number(tx.amount)}`, updatedAt: new Date() })
        .where(eq(financialAccount.id, tx.transferToId));
    }

    await dtx.delete(transaction).where(eq(transaction.id, id));
  });

  return c.json({ success: true });
});
