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

// O(1) summary — used by the list endpoint to avoid building full schedules.
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
    // Variable rate — use closed-form balance formula: balance_k = P×((1+r)^n−(1+r)^k)/((1+r)^n−1)
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
      monthlyPayment: Math.round(pmt * 100) / 100,
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
    // Interest is pre-calculated on the full principal for the entire tenure
    // and spread evenly; the monthly interest portion never changes.
    // Banks ceil to the nearest whole ringgit, so the last instalment is
    // adjusted to clear the exact remaining balance (avoids overpayment).
    const totalInterest = principal * (annualRate / 100) * (termMonths / 12);
    const totalAmount = principal + totalInterest;
    const principalPerMonth = principal / termMonths;
    const interestPerMonth = totalInterest / termMonths;
    // Ceil to nearest whole ringgit (Malaysian bank convention)
    const monthlyPayment = Math.ceil(totalAmount / termMonths);

    for (let i = 1; i <= termMonths; i++) {
      const isLast = i === termMonths;
      // Last payment = whatever remains after (termMonths-1) full payments
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
    // Variable Rate — Standard compound-interest amortization (PMT formula)
    // Interest is recalculated each month on the remaining balance (reducing balance).
    // Equal monthly payments; interest portion shrinks and principal portion grows over time.
    // The last instalment is adjusted to clear any floating-point residual.
    const factor = Math.pow(1 + monthlyRate, termMonths);
    const pmt =
      monthlyRate === 0
        ? principal / termMonths
        : (principal * monthlyRate * factor) / (factor - 1);

    let balance = principal;
    for (let i = 1; i <= termMonths; i++) {
      const isLast = i === termMonths;
      const interest = balance * monthlyRate;
      // Last month: pay exactly the remaining balance to avoid residual
      const principalPart = isLast ? balance : pmt - interest;
      const payment = isLast
        ? Math.round((balance + interest) * 100) / 100
        : Math.round(pmt * 100) / 100;
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

export function getMonthsPaid(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  return (
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  );
}
