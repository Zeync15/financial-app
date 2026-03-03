import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { loan } from '../schema/app';
import { requireAuth } from '../middleware';
import type { AppEnv } from '../types';

export const loanRoutes = new Hono<AppEnv>();
loanRoutes.use(requireAuth);

// List loans
loanRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const loans = await db
    .select()
    .from(loan)
    .where(eq(loan.userId, user.id))
    .orderBy(loan.createdAt);

  // Calculate amortization summary for each loan
  const result = loans.map((l) => {
    const schedule = calculateAmortization(
      Number(l.principal),
      Number(l.interestRate),
      l.loanTermMonths,
      l.paymentType!,
    );
    const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
    const monthsPaid = getMonthsPaid(l.startDate!);
    const remainingBalance =
      monthsPaid >= schedule.length
        ? 0
        : schedule[monthsPaid]?.balance ?? 0;

    return {
      ...l,
      monthlyPayment: schedule[0]?.payment ?? 0,
      totalInterest,
      remainingBalance,
      monthsPaid,
    };
  });

  return c.json(result);
});

// Get amortization schedule for a loan
loanRoutes.get('/:id/schedule', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const [l] = await db
    .select()
    .from(loan)
    .where(and(eq(loan.id, id), eq(loan.userId, user.id)));
  if (!l) return c.json({ error: 'Not found' }, 404);

  const schedule = calculateAmortization(
    Number(l.principal),
    Number(l.interestRate),
    l.loanTermMonths,
    l.paymentType!,
  );

  return c.json(schedule);
});

// Create loan
loanRoutes.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json();
  const [l] = await db
    .insert(loan)
    .values({
      userId: user.id,
      name: body.name,
      principal: body.principal,
      currency: body.currency || 'MYR',
      interestRate: body.interestRate,
      loanTermMonths: body.loanTermMonths,
      startDate: body.startDate,
      paymentType: body.paymentType,
    })
    .returning();
  return c.json(l, 201);
});

// Update loan
loanRoutes.put('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
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
  if (!l) return c.json({ error: 'Not found' }, 404);
  return c.json(l);
});

// Delete loan
loanRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const [l] = await db
    .delete(loan)
    .where(and(eq(loan.id, id), eq(loan.userId, user.id)))
    .returning();
  if (!l) return c.json({ error: 'Not found' }, 404);
  return c.json({ success: true });
});

// ─── Amortization Calculator ────────────────────────────────────────────────

interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

function calculateAmortization(
  principal: number,
  annualRate: number,
  termMonths: number,
  paymentType: string,
): AmortizationRow[] {
  const monthlyRate = annualRate / 100 / 12;
  const schedule: AmortizationRow[] = [];

  if (paymentType === 'fixed') {
    // Fixed monthly payment (standard amortization)
    const payment =
      monthlyRate === 0
        ? principal / termMonths
        : (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
          (Math.pow(1 + monthlyRate, termMonths) - 1);

    let balance = principal;
    for (let i = 1; i <= termMonths; i++) {
      const interest = balance * monthlyRate;
      const principalPart = payment - interest;
      balance = Math.max(0, balance - principalPart);
      schedule.push({
        month: i,
        payment: Math.round(payment * 100) / 100,
        principal: Math.round(principalPart * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      });
    }
  } else {
    // Reducing balance -- principal portion is fixed, interest varies
    const fixedPrincipal = principal / termMonths;
    let balance = principal;
    for (let i = 1; i <= termMonths; i++) {
      const interest = balance * monthlyRate;
      const payment = fixedPrincipal + interest;
      balance = Math.max(0, balance - fixedPrincipal);
      schedule.push({
        month: i,
        payment: Math.round(payment * 100) / 100,
        principal: Math.round(fixedPrincipal * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      });
    }
  }

  return schedule;
}

function getMonthsPaid(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  return (
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  );
}
