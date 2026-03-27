import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { loan } from "../schema/app";
import { requireAuth } from "../middleware";
import type { AppEnv } from "../types";
import {
  calculateSummary,
  calculateAmortization,
  getMonthsPaid,
} from "../lib/loanCalculations";

export const loanRoutes = new Hono<AppEnv>();
loanRoutes.use(requireAuth);

// List loans
loanRoutes.get("/", async (c) => {
  const user = c.get("user")!;
  const loans = await db
    .select()
    .from(loan)
    .where(eq(loan.userId, user.id))
    .orderBy(loan.createdAt);

  // Calculate summary for each loan without building the full schedule
  const result = loans.map((l) => {
    const monthsPaid = getMonthsPaid(l.startDate!);
    const { monthlyPayment, totalInterest, remainingBalance } =
      calculateSummary(
        Number(l.principal),
        Number(l.interestRate),
        l.loanTermMonths,
        l.paymentType!,
        monthsPaid,
      );
    return {
      ...l,
      monthlyPayment,
      totalInterest,
      remainingBalance,
      monthsPaid,
    };
  });

  return c.json(result);
});

// Get amortization schedule for a loan
loanRoutes.get("/:id/schedule", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const [l] = await db
    .select()
    .from(loan)
    .where(and(eq(loan.id, id), eq(loan.userId, user.id)));
  if (!l) return c.json({ error: "Not found" }, 404);

  const schedule = calculateAmortization(
    Number(l.principal),
    Number(l.interestRate),
    l.loanTermMonths,
    l.paymentType!,
  );

  return c.json(schedule);
});

// Create loan
loanRoutes.post("/", async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json();
  const [l] = await db
    .insert(loan)
    .values({
      userId: user.id,
      name: body.name,
      principal: body.principal,
      currency: body.currency || "MYR",
      interestRate: body.interestRate,
      loanTermMonths: body.loanTermMonths,
      startDate: body.startDate,
      paymentType: body.paymentType,
    })
    .returning();
  return c.json(l, 201);
});

// Update loan
loanRoutes.put("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json();
  const [l] = await db
    .update(loan)
    .set({
      name: body.name,
      principal: body.principal,
      currency: body.currency,
      interestRate: body.interestRate,
      loanTermMonths: body.loanTermMonths,
      startDate: body.startDate,
      paymentType: body.paymentType,
      updatedAt: new Date(),
    })
    .where(and(eq(loan.id, id), eq(loan.userId, user.id)))
    .returning();
  if (!l) return c.json({ error: "Not found" }, 404);
  return c.json(l);
});

// Delete loan
loanRoutes.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const [l] = await db
    .delete(loan)
    .where(and(eq(loan.id, id), eq(loan.userId, user.id)))
    .returning();
  if (!l) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});
