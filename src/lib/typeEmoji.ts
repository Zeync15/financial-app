// Fixed emoji (Fluent keys, see emojiCatalog.ts) for things that have a type
// rather than a category: accounts, loans and instalments.

export const ACCOUNT_TYPE_EMOJI: Record<string, string> = {
  checking: "bank",
  savings: "pig_face",
  credit_card: "credit_card",
  cash: "dollar_banknote",
  ewallet: "mobile_phone",
  foreign_currency: "currency_exchange",
  fixed_deposit: "locked",
  unit_trust: "bar_chart",
  tabung_haji: "kaaba",
  gold: "coin",
  retirement: "beach_with_umbrella",
  receivable: "handshake",
  investment: "chart_increasing",
  loan: "scroll",
  instalment: "spiral_calendar",
};

// What a loan is for (loan.kind). No kind: the generic loan emoji.
export const LOAN_KINDS: { value: string; label: string; emoji: string }[] = [
  { value: "house", label: "House", emoji: "house" },
  { value: "car", label: "Car", emoji: "automobile" },
  { value: "motorcycle", label: "Motorcycle", emoji: "motor_scooter" },
  { value: "personal", label: "Personal", emoji: "money_bag" },
  { value: "education", label: "Education", emoji: "graduation_cap" },
  { value: "other", label: "Other", emoji: "scroll" },
];

export function loanEmoji(kind: string | null | undefined): string {
  return LOAN_KINDS.find((k) => k.value === kind)?.emoji ?? ACCOUNT_TYPE_EMOJI.loan!;
}

export function accountEmoji(type: string): string {
  return ACCOUNT_TYPE_EMOJI[type] ?? "bank";
}
