import { Hono } from "hono";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { budget, category, transaction, financialAccount } from "../schema/app";
import { requireAuth } from "../middleware";
import type { AppEnv } from "../types";

export const budgetRoutes = new Hono<AppEnv>();
budgetRoutes.use(requireAuth);

// List budgets with spent amounts
budgetRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const budgets = await db
    .select({
      id: budget.id,
      userId: budget.userId,
      categoryId: budget.categoryId,
      name: budget.name,
      amount: budget.amount,
      currency: budget.currency,
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate,
      categoryName: category.name,
      categoryColor: category.color,
    })
    .from(budget)
    .leftJoin(category, eq(budget.categoryId, category.id))
    .where(eq(budget.userId, user.id));

  // Calculate spent for each budget in the current period
  const now = new Date();
  const results = await Promise.all(
    budgets.map(async (b) => {
      const { periodStart, periodEnd } = getPeriodRange(b.period!, now);

      // Get user account IDs
      const userAccounts = await db
        .select({ id: financialAccount.id })
        .from(financialAccount)
        .where(eq(financialAccount.userId, user.id));
      const accountIds = userAccounts.map((a) => a.id);

      if (accountIds.length === 0) return { ...b, spent: "0" };

      const [result] = await db
        .select({ total: sql<string>`COALESCE(SUM(${transaction.amount}), 0)` })
        .from(transaction)
        .where(
          and(
            eq(transaction.categoryId, b.categoryId!),
            eq(transaction.type, "expense"),
            sql`${transaction.accountId} IN ${accountIds}`,
            gte(transaction.date, periodStart),
            lte(transaction.date, periodEnd),
          ),
        );

      return { ...b, spent: result?.total || "0" };
    }),
  );

  return c.json(results);
});

// Create budget
budgetRoutes.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const [b] = await db
    .insert(budget)
    .values({
      userId: user.id,
      categoryId: body.categoryId,
      name: body.name || null,
      amount: body.amount,
      currency: body.currency || "MYR",
      period: body.period,
      startDate: body.startDate || new Date().toISOString().split("T")[0]!,
    })
    .returning();
  return c.json(b, 201);
});

// Update budget
budgetRoutes.put("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const [b] = await db
    .update(budget)
    .set({
      categoryId: body.categoryId,
      name: body.name,
      amount: body.amount,
      currency: body.currency,
      period: body.period,
      updatedAt: new Date(),
    })
    .where(and(eq(budget.id, id), eq(budget.userId, user.id)))
    .returning();
  if (!b) return c.json({ error: "Not found" }, 404);
  return c.json(b);
});

// Delete budget
budgetRoutes.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const [b] = await db
    .delete(budget)
    .where(and(eq(budget.id, id), eq(budget.userId, user.id)))
    .returning();
  if (!b) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// ─── Categories (co-located since budgets need them) ────────────────────────

budgetRoutes.get("/categories", async (c) => {
  const user = c.get("user")!;
  const categories = await db
    .select()
    .from(category)
    .where(sql`${category.userId} = ${user.id} OR ${category.userId} IS NULL`)
    .orderBy(category.sortOrder);
  return c.json(categories);
});

budgetRoutes.post("/categories", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const [cat] = await db
    .insert(category)
    .values({
      userId: user.id,
      name: body.name,
      icon: body.icon || null,
      color: body.color || "#1677ff",
      type: body.type,
    })
    .returning();
  return c.json(cat, 201);
});

budgetRoutes.delete("/categories/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const [cat] = await db
    .delete(category)
    .where(and(eq(category.id, id), eq(category.userId, user.id)))
    .returning();
  if (!cat) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPeriodRange(period: string, now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDay();

  if (period === "monthly") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      periodStart: start.toISOString().split("T")[0]!,
      periodEnd: end.toISOString().split("T")[0]!,
    };
  }
  if (period === "weekly") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - day);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      periodStart: startOfWeek.toISOString().split("T")[0]!,
      periodEnd: endOfWeek.toISOString().split("T")[0]!,
    };
  }
  // yearly
  return {
    periodStart: `${year}-01-01`,
    periodEnd: `${year}-12-31`,
  };
}
