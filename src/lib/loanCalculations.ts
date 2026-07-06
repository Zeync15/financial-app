// Pure loan math — moved client-side from the old server/lib/loanCalculations.ts.
// No DB access; safe to run in the browser.

export interface LoanSummary {
  monthlyPayment: number;
  totalInterest: number;
  remainingBalance: number;
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

// O(1) summary — used by the loans list to avoid building full schedules.
export function calculateSummary(
  principal: number,
  annualRate: number,
  termMonths: number,
  paymentType: string,
  monthsPaid: number,
): LoanSummary {
  if (paymentType === "fixed") {
    // Flat rate (Malaysian Hire Purchase) — all values are pre-calculable
    const totalInterest = principal * (annualRate / 100) * (termMonths / 12);
    const totalAmount = principal + totalInterest;
    const monthlyPayment = Math.ceil(totalAmount / termMonths);
    const principalPerMonth = principal / termMonths;
    const remainingBalance =
      monthsPaid >= termMonths
        ? 0
        : Math.max(
            0,
            Math.round((principal - monthsPaid * principalPerMonth) * 100) /
              100,
          );
    return {
      monthlyPayment,
      totalInterest: Math.round(totalInterest * 100) / 100,
      remainingBalance,
    };
  } else {
    // Variable rate — closed-form balance formula
    const monthlyRate = annualRate / 100 / 12;
    const factor = Math.pow(1 + monthlyRate, termMonths);
    const pmt =
      monthlyRate === 0
        ? principal / termMonths
        : (principal * monthlyRate * factor) / (factor - 1);
    const totalInterest =
      Math.round((pmt * termMonths - principal) * 100) / 100;
    let remainingBalance: number;
    if (monthsPaid >= termMonths) {
      remainingBalance = 0;
    } else if (monthlyRate === 0) {
      remainingBalance = Math.max(
        0,
        Math.round((principal - monthsPaid * (principal / termMonths)) * 100) /
          100,
      );
    } else {
      const factorK = Math.pow(1 + monthlyRate, monthsPaid);
      remainingBalance = Math.max(
        0,
        Math.round(((principal * (factor - factorK)) / (factor - 1)) * 100) /
          100,
      );
    }
    return {
      monthlyPayment: Math.ceil(pmt),
      totalInterest,
      remainingBalance,
    };
  }
}

export function calculateAmortization(
  principal: number,
  annualRate: number,
  termMonths: number,
  paymentType: string,
): AmortizationRow[] {
  const monthlyRate = annualRate / 100 / 12;
  const schedule: AmortizationRow[] = [];

  if (paymentType === "fixed") {
    // Fixed Rate — Malaysian Hire Purchase (flat rate, Hire Purchase Act 1967)
    const totalInterest = principal * (annualRate / 100) * (termMonths / 12);
    const totalAmount = principal + totalInterest;
    const principalPerMonth = principal / termMonths;
    const interestPerMonth = totalInterest / termMonths;
    const monthlyPayment = Math.ceil(totalAmount / termMonths);

    for (let i = 1; i <= termMonths; i++) {
      const isLast = i === termMonths;
      const payment = isLast
        ? Math.round((totalAmount - (termMonths - 1) * monthlyPayment) * 100) /
          100
        : monthlyPayment;
      const balance = Math.max(
        0,
        Math.round((principal - i * principalPerMonth) * 100) / 100,
      );
      schedule.push({
        month: i,
        payment,
        principal: Math.round(principalPerMonth * 100) / 100,
        interest: Math.round(interestPerMonth * 100) / 100,
        balance,
      });
    }
  } else {
    // Variable Rate — standard compound-interest amortization (PMT formula)
    const factor = Math.pow(1 + monthlyRate, termMonths);
    const pmt =
      monthlyRate === 0
        ? principal / termMonths
        : (principal * monthlyRate * factor) / (factor - 1);

    const ceilPmt = Math.ceil(pmt);
    let balance = principal;
    for (let i = 1; i <= termMonths; i++) {
      const isLast = i === termMonths;
      const interest = balance * monthlyRate;
      const principalPart = isLast ? balance : ceilPmt - interest;
      const payment = isLast
        ? Math.round((balance + interest) * 100) / 100
        : ceilPmt;
      balance = Math.max(0, balance - principalPart);
      schedule.push({
        month: i,
        payment,
        principal: Math.round(principalPart * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      });
    }
  }

  return schedule;
}

// Parse a YYYY-MM-DD string into a LOCAL date. `new Date("2026-07-01")` parses
// as UTC midnight, which shifts the day (and possibly month) in non-UTC
// timezones (e.g. UTC+8 sees the previous day). Splitting the components keeps
// the calendar date the user actually entered.
function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

// Days in the given year/month (monthIdx is 0-based).
function daysInMonth(year: number, monthIdx: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

export function getMonthsPaid(startDate: string): number {
  const start = parseLocalDate(startDate);
  const now = new Date();
  return (
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  );
}

// Months paid for an instalment. Unlike a loan (whose first payment lands one
// month after start), an instalment is paid on `paymentDay` every month, with
// the first payment on the first occurrence of that day on or after the start
// date. Each occurrence that has passed counts. Clamped to [0, termMonths].
export function getInstalmentMonthsPaid(
  startDate: string,
  paymentDay: number | null,
  termMonths: number,
): number {
  const start = parseLocalDate(startDate);
  const now = new Date();
  const day = paymentDay ?? start.getDate();

  // First payment: `day` (clamped to month length) in the start month, or the
  // next month if that day had already passed by the start date.
  let fy = start.getFullYear();
  let fm = start.getMonth();
  if (start.getDate() > Math.min(day, daysInMonth(fy, fm))) {
    fm += 1;
    if (fm > 11) {
      fm = 0;
      fy += 1;
    }
  }

  const monthDiff = (now.getFullYear() - fy) * 12 + (now.getMonth() - fm);
  // This month's payment counts once its (clamped) day-of-month has arrived.
  const dueDay = Math.min(day, daysInMonth(now.getFullYear(), now.getMonth()));
  const paidThisMonth = now.getDate() >= dueDay ? 1 : 0;
  return Math.max(0, Math.min(monthDiff + paidThisMonth, termMonths));
}

// ── Reducing-balance simulation with an effective-dated event timeline ────────
// Only reducing-balance loans use this; fixed-rate loans stay on the closed-form
// calculateSummary/calculateAmortization above (their interest is precomputed).

export type LoanEventType = "extra_payment" | "payment_change" | "rate_change";

export interface LoanEvent {
  effectiveDate: string; // YYYY-MM-DD
  type: LoanEventType;
  amount: number; // extra_payment: lump sum · payment_change: new installment · rate_change: new annual %
}

export interface LoanSimulation {
  schedule: AmortizationRow[];
  monthlyPayment: number; // installment currently in effect
  totalInterest: number;
  remainingBalance: number;
  payoffMonths: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Whole months from `start` to `date` (same convention as getMonthsPaid).
function monthDiff(start: string, date: string): number {
  const s = parseLocalDate(start);
  const d = parseLocalDate(date);
  return (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth());
}

// Standard amortizing payment for `balance` over `nMonths` at `annualRate`.
function pmt(balance: number, annualRate: number, nMonths: number): number {
  const r = annualRate / 100 / 12;
  if (nMonths <= 0) return balance;
  if (r === 0) return balance / nMonths;
  const f = Math.pow(1 + r, nMonths);
  return (balance * r * f) / (f - 1);
}

export function simulateReducingBalance(
  principal: number,
  annualRate: number,
  termMonths: number,
  startDate: string,
  events: LoanEvent[],
  monthsPaid: number,
): LoanSimulation {
  // Bucket events by the payment-month they first take effect (1-indexed).
  const byMonth = new Map<
    number,
    { extra: number; newPayment?: number; newRate?: number }
  >();
  for (const ev of events) {
    const m = Math.max(1, monthDiff(startDate, ev.effectiveDate));
    const b = byMonth.get(m) ?? { extra: 0 };
    if (ev.type === "extra_payment") b.extra += ev.amount;
    else if (ev.type === "payment_change") b.newPayment = ev.amount;
    else if (ev.type === "rate_change") b.newRate = ev.amount;
    byMonth.set(m, b);
  }

  const CAP = 1200;
  const schedule: AmortizationRow[] = [];
  let balance = principal;
  let rate = annualRate;
  let payment = Math.ceil(pmt(principal, annualRate, termMonths));
  let currentInstallment = payment;
  const nowMonth = Math.max(1, monthsPaid + 1); // the next payment due

  for (let i = 1; i <= CAP && balance > 0.005; i++) {
    const ev = byMonth.get(i);
    if (ev?.newRate != null) {
      rate = ev.newRate;
      // Keep the original payoff date: re-amortize the current balance over the
      // remaining contractual months. Installment rises/falls, tenure fixed.
      payment = Math.ceil(pmt(balance, rate, Math.max(1, termMonths - (i - 1))));
    }
    if (ev?.newPayment != null) payment = ev.newPayment;

    if (i === nowMonth) currentInstallment = payment;

    const interest = balance * (rate / 100 / 12);
    let principalPart = payment - interest;
    // Guard against a payment that can't cover interest (non-amortizing).
    if (principalPart < 0) principalPart = 0;
    if (principalPart > balance) principalPart = balance;
    balance -= principalPart;

    // One-off lump sum this month → straight principal reduction (cuts tenure).
    let paid = interest + principalPart;
    if (ev?.extra) {
      const extra = Math.min(ev.extra, balance);
      balance -= extra;
      principalPart += extra;
      paid += extra;
    }

    schedule.push({
      month: i,
      payment: round2(paid),
      principal: round2(principalPart),
      interest: round2(interest),
      balance: round2(Math.max(0, balance)),
    });
  }

  const payoffMonths = schedule.length;
  const totalInterest = round2(schedule.reduce((s, r) => s + r.interest, 0));
  const remainingBalance =
    monthsPaid <= 0
      ? round2(principal)
      : monthsPaid >= payoffMonths
        ? 0
        : schedule[monthsPaid - 1]!.balance;
  const monthlyPayment = nowMonth > payoffMonths ? 0 : currentInstallment;

  return { schedule, monthlyPayment, totalInterest, remainingBalance, payoffMonths };
}
