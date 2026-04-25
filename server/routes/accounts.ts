import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { financialAccount } from '../schema/app.js';
import { requireAuth } from '../middleware.js';
import type { AppEnv } from '../types.js';

export const accountRoutes = new Hono<AppEnv>();
accountRoutes.use(requireAuth);

// List accounts
accountRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const accounts = await db
    .select()
    .from(financialAccount)
    .where(eq(financialAccount.userId, user.id))
    .orderBy(financialAccount.createdAt);
  return c.json(accounts);
});

// Get single account
accountRoutes.get('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const [acc] = await db
    .select()
    .from(financialAccount)
    .where(and(eq(financialAccount.id, id), eq(financialAccount.userId, user.id)));
  if (!acc) return c.json({ error: 'Not found' }, 404);
  return c.json(acc);
});

// Create account
accountRoutes.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();
  const [acc] = await db
    .insert(financialAccount)
    .values({
      userId: user.id,
      name: body.name,
      type: body.type,
      currency: body.currency || 'MYR',
      institution: body.institution || null,
      balance: body.balance || '0',
    })
    .returning();
  return c.json(acc, 201);
});

// Update account
accountRoutes.put('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const body = await c.req.json();
  const [acc] = await db
    .update(financialAccount)
    .set({
      name: body.name,
      type: body.type,
      currency: body.currency,
      institution: body.institution,
      balance: body.balance,
      isActive: body.isActive,
      updatedAt: new Date(),
    })
    .where(and(eq(financialAccount.id, id), eq(financialAccount.userId, user.id)))
    .returning();
  if (!acc) return c.json({ error: 'Not found' }, 404);
  return c.json(acc);
});

// Delete account
accountRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const [acc] = await db
    .delete(financialAccount)
    .where(and(eq(financialAccount.id, id), eq(financialAccount.userId, user.id)))
    .returning();
  if (!acc) return c.json({ error: 'Not found' }, 404);
  return c.json({ success: true });
});
