import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { portfolio, holding, investmentTransaction } from '../schema/app.js';
import { requireAuth } from '../middleware.js';
import type { AppEnv } from '../types.js';

export const portfolioRoutes = new Hono<AppEnv>();
portfolioRoutes.use(requireAuth);

// ─── Portfolios ─────────────────────────────────────────────────────────────

portfolioRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const portfolios = await db
    .select()
    .from(portfolio)
    .where(eq(portfolio.userId, user.id))
    .orderBy(portfolio.createdAt);

  // Fetch holdings for each portfolio
  const result = await Promise.all(
    portfolios.map(async (p) => {
      const holdings = await db
        .select()
        .from(holding)
        .where(eq(holding.portfolioId, p.id));
      const totalValue = holdings.reduce(
        (sum, h) => sum + Number(h.quantity) * Number(h.avgCostPrice),
        0,
      );
      return { ...p, holdings, totalValue };
    }),
  );

  return c.json(result);
});

portfolioRoutes.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();
  const [p] = await db
    .insert(portfolio)
    .values({
      userId: user.id,
      name: body.name,
      currency: body.currency || 'MYR',
    })
    .returning();
  return c.json(p, 201);
});

portfolioRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const [p] = await db
    .delete(portfolio)
    .where(and(eq(portfolio.id, id), eq(portfolio.userId, user.id)))
    .returning();
  if (!p) return c.json({ error: 'Not found' }, 404);
  return c.json({ success: true });
});

// ─── Holdings ───────────────────────────────────────────────────────────────

portfolioRoutes.post('/:portfolioId/holdings', async (c) => {
  const user = c.get('user')!;
  const portfolioId = c.req.param('portfolioId');

  // Verify portfolio belongs to user
  const [p] = await db
    .select()
    .from(portfolio)
    .where(and(eq(portfolio.id, portfolioId), eq(portfolio.userId, user.id)));
  if (!p) return c.json({ error: 'Portfolio not found' }, 404);

  const body = await c.req.json();
  const [h] = await db
    .insert(holding)
    .values({
      portfolioId,
      symbol: body.symbol.toUpperCase(),
      name: body.name || null,
      type: body.type,
      quantity: body.quantity,
      avgCostPrice: body.avgCostPrice,
      currency: body.currency || p.currency,
    })
    .returning();
  return c.json(h, 201);
});

portfolioRoutes.put('/:portfolioId/holdings/:holdingId', async (c) => {
  const user = c.get('user')!;
  const portfolioId = c.req.param('portfolioId');
  const holdingId = c.req.param('holdingId');

  const [p] = await db
    .select()
    .from(portfolio)
    .where(and(eq(portfolio.id, portfolioId), eq(portfolio.userId, user.id)));
  if (!p) return c.json({ error: 'Portfolio not found' }, 404);

  const body = await c.req.json();
  const [h] = await db
    .update(holding)
    .set({
      symbol: body.symbol?.toUpperCase(),
      name: body.name,
      type: body.type,
      quantity: body.quantity,
      avgCostPrice: body.avgCostPrice,
      currency: body.currency,
      updatedAt: new Date(),
    })
    .where(and(eq(holding.id, holdingId), eq(holding.portfolioId, portfolioId)))
    .returning();
  if (!h) return c.json({ error: 'Holding not found' }, 404);
  return c.json(h);
});

portfolioRoutes.delete('/:portfolioId/holdings/:holdingId', async (c) => {
  const user = c.get('user')!;
  const portfolioId = c.req.param('portfolioId');
  const holdingId = c.req.param('holdingId');

  const [p] = await db
    .select()
    .from(portfolio)
    .where(and(eq(portfolio.id, portfolioId), eq(portfolio.userId, user.id)));
  if (!p) return c.json({ error: 'Portfolio not found' }, 404);

  const [h] = await db
    .delete(holding)
    .where(and(eq(holding.id, holdingId), eq(holding.portfolioId, portfolioId)))
    .returning();
  if (!h) return c.json({ error: 'Holding not found' }, 404);
  return c.json({ success: true });
});
