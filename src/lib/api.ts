// Supabase-backed data layer. Preserves the old REST-style api.get/post/put/delete
// surface so page components stay unchanged, but routes each call to supabase-js
// (direct table CRUD) or to a Postgres RPC (atomic balance mutations).
//
// All shapes returned here match what the old Hono API returned (camelCase keys,
// money as DECIMAL strings) so the UI needs no changes.
import { supabase, getUserId } from "./supabase";
import { calculateSummary, calculateAmortization, getMonthsPaid } from "./loanCalculations";

// ─── helpers ──────────────────────────────────────────────────────────────
function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// Drop undefined keys so partial updates don't overwrite columns with null.
function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

const nowIso = () => new Date().toISOString();
const today = () => new Date().toISOString().split("T")[0]!;

type Body = Record<string, any>;

// ─── accounts ───────────────────────────────────────────────────────────────
const ACCOUNT_COLS = "id, name, type, currency, institution, balance, isActive:is_active, createdAt:created_at";

async function listAccounts() {
  return unwrap(await supabase.from("financial_account").select(ACCOUNT_COLS).order("created_at"));
}
async function createAccount(b: Body) {
  const user_id = await getUserId();
  return unwrap(
    await supabase
      .from("financial_account")
      .insert({
        user_id,
        name: b.name,
        type: b.type,
        currency: b.currency || "MYR",
        institution: b.institution || null,
        balance: b.balance ?? "0",
      })
      .select(ACCOUNT_COLS)
      .single(),
  );
}
async function updateAccount(id: string, b: Body) {
  return unwrap(
    await supabase
      .from("financial_account")
      .update(
        clean({
          name: b.name,
          type: b.type,
          currency: b.currency,
          institution: b.institution,
          balance: b.balance,
          is_active: b.isActive,
          updated_at: nowIso(),
        }),
      )
      .eq("id", id)
      .select(ACCOUNT_COLS)
      .single(),
  );
}

// ─── categories ───────────────────────────────────────────────────────────
const CATEGORY_COLS =
  "id, userId:user_id, name, icon, color, type, parentId:parent_id, sortOrder:sort_order, isActive:is_active";

async function listCategories() {
  // RLS exposes own rows + system defaults (user_id IS NULL).
  // Merge per-user sort overrides from user_category_order.
  const [cats, overrides] = await Promise.all([
    supabase.from("category").select(CATEGORY_COLS).order("sort_order"),
    supabase.from("user_category_order").select("category_id, sort_order"),
  ]);
  const rows = unwrap(cats) as any[];
  const ov = unwrap(overrides) as { category_id: string; sort_order: number }[];
  const ovMap = new Map(ov.map((r) => [r.category_id, r.sort_order]));
  return rows
    .map((r) => ({ ...r, sortOrder: ovMap.get(r.id) ?? r.sortOrder }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

async function reorderCategories(body: Body) {
  const user_id = await getUserId();
  const order = body.order as { id: string; sortOrder: number }[];
  if (!Array.isArray(order) || order.length === 0) return { success: true };
  const rows = order.map((o) => ({
    user_id,
    category_id: o.id,
    sort_order: o.sortOrder,
    updated_at: nowIso(),
  }));
  const { error } = await supabase
    .from("user_category_order")
    .upsert(rows, { onConflict: "user_id,category_id" });
  if (error) throw new Error(error.message);
  return { success: true };
}
async function createCategory(b: Body) {
  const user_id = await getUserId();
  return unwrap(
    await supabase
      .from("category")
      .insert({
        user_id,
        name: b.name,
        icon: b.icon || null,
        color: b.color || "#1677ff",
        type: b.type,
      })
      .select(CATEGORY_COLS)
      .single(),
  );
}
async function updateCategory(id: string, b: Body) {
  return unwrap(
    await supabase
      .from("category")
      .update(clean({ name: b.name, color: b.color, icon: b.icon, type: b.type }))
      .eq("id", id)
      .select(CATEGORY_COLS)
      .single(),
  );
}

// ─── transactions ───────────────────────────────────────────────────────────
async function listTransactions() {
  const rows = unwrap(
    await supabase
      .from("transaction")
      .select(
        `id, accountId:account_id, categoryId:category_id, type, amount,
         description, notes, date, transferToId:transfer_to_id, createdAt:created_at,
         category ( name, color ),
         account:financial_account!transaction_account_id_fkey ( name )`,
      )
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
  ) as any[];

  return rows.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    categoryId: r.categoryId,
    type: r.type,
    amount: r.amount,
    description: r.description,
    notes: r.notes,
    date: r.date,
    transferToId: r.transferToId,
    createdAt: r.createdAt,
    categoryName: r.category?.name ?? null,
    categoryColor: r.category?.color ?? null,
    accountName: r.account?.name ?? null,
  }));
}
async function createTransaction(b: Body) {
  return unwrap(
    await supabase.rpc("create_transaction", {
      p_account_id: b.accountId,
      p_type: b.type,
      p_amount: b.amount,
      p_date: b.date,
      p_category_id: b.categoryId || null,
      p_description: b.description || null,
      p_notes: b.notes || null,
      p_transfer_to_id: b.transferToId || null,
    }),
  );
}
async function updateTransaction(id: string, b: Body) {
  return unwrap(
    await supabase.rpc("update_transaction", {
      p_id: id,
      p_account_id: b.accountId,
      p_type: b.type,
      p_amount: b.amount,
      p_date: b.date,
      p_category_id: b.categoryId || null,
      p_description: b.description || null,
      p_notes: b.notes || null,
      p_transfer_to_id: b.transferToId || null,
    }),
  );
}
async function deleteTransaction(id: string) {
  unwrap(await supabase.rpc("delete_transaction", { p_id: id }));
  return { success: true };
}

// ─── budgets ────────────────────────────────────────────────────────────────
function getPeriodRange(period: string, now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDay();
  if (period === "monthly") {
    return {
      periodStart: new Date(year, month, 1).toISOString().split("T")[0]!,
      periodEnd: new Date(year, month + 1, 0).toISOString().split("T")[0]!,
    };
  }
  if (period === "weekly") {
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      periodStart: start.toISOString().split("T")[0]!,
      periodEnd: end.toISOString().split("T")[0]!,
    };
  }
  return { periodStart: `${year}-01-01`, periodEnd: `${year}-12-31` };
}

async function listBudgets() {
  const rows = unwrap(
    await supabase.from("budget").select(
      `id, categoryId:category_id, name, amount, currency, period,
         startDate:start_date, endDate:end_date,
         category ( name, color )`,
    ),
  ) as any[];

  const now = new Date();
  return Promise.all(
    rows.map(async (b) => {
      const { periodStart, periodEnd } = getPeriodRange(b.period, now);
      const tx = unwrap(
        await supabase
          .from("transaction")
          .select("amount")
          .eq("category_id", b.categoryId)
          .eq("type", "expense")
          .gte("date", periodStart)
          .lte("date", periodEnd),
      ) as Array<{ amount: string }>;
      const spent = tx.reduce((s, t) => s + Number(t.amount), 0);
      return {
        id: b.id,
        categoryId: b.categoryId,
        name: b.name,
        amount: b.amount,
        currency: b.currency,
        period: b.period,
        startDate: b.startDate,
        endDate: b.endDate,
        categoryName: b.category?.name ?? null,
        categoryColor: b.category?.color ?? null,
        spent: String(spent),
      };
    }),
  );
}
async function createBudget(b: Body) {
  const user_id = await getUserId();
  return unwrap(
    await supabase
      .from("budget")
      .insert({
        user_id,
        category_id: b.categoryId,
        name: b.name || null,
        amount: b.amount,
        currency: b.currency || "MYR",
        period: b.period,
        start_date: b.startDate || today(),
      })
      .select()
      .single(),
  );
}

// ─── portfolios + holdings ──────────────────────────────────────────────────
async function listPortfolios() {
  const ps = unwrap(
    await supabase.from("portfolio").select("id, name, currency, createdAt:created_at").order("created_at"),
  ) as any[];

  return Promise.all(
    ps.map(async (p) => {
      const holdings = unwrap(
        await supabase
          .from("holding")
          .select(
            `id, portfolioId:portfolio_id, symbol, name, type, quantity,
             avgCostPrice:avg_cost_price, currency,
             currentPrice:current_price, priceUpdatedAt:price_updated_at`,
          )
          .eq("portfolio_id", p.id),
      ) as Array<{ quantity: string; avgCostPrice: string; currentPrice: string | null }>;
      // Value at market price when known, else fall back to cost basis.
      const totalValue = holdings.reduce(
        (s, h) => s + Number(h.quantity) * Number(h.currentPrice ?? h.avgCostPrice),
        0,
      );
      return { id: p.id, name: p.name, currency: p.currency, holdings, totalValue };
    }),
  );
}
async function createPortfolio(b: Body) {
  const user_id = await getUserId();
  return unwrap(
    await supabase
      .from("portfolio")
      .insert({ user_id, name: b.name, currency: b.currency || "MYR" })
      .select()
      .single(),
  );
}
async function addHolding(portfolioId: string, b: Body) {
  const p = unwrap(await supabase.from("portfolio").select("currency").eq("id", portfolioId).single()) as {
    currency: string;
  };
  return unwrap(
    await supabase
      .from("holding")
      .insert({
        portfolio_id: portfolioId,
        symbol: String(b.symbol).toUpperCase(),
        name: b.name || null,
        type: b.type,
        quantity: b.quantity,
        avg_cost_price: b.avgCostPrice,
        currency: b.currency || p.currency,
      })
      .select()
      .single(),
  );
}
async function updateHolding(portfolioId: string, holdingId: string, b: Body) {
  return unwrap(
    await supabase
      .from("holding")
      .update(
        clean({
          symbol: b.symbol ? String(b.symbol).toUpperCase() : undefined,
          name: b.name,
          type: b.type,
          quantity: b.quantity,
          avg_cost_price: b.avgCostPrice,
          currency: b.currency,
          current_price: b.currentPrice,
          price_updated_at: b.priceUpdatedAt,
          updated_at: nowIso(),
        }),
      )
      .eq("id", holdingId)
      .eq("portfolio_id", portfolioId)
      .select()
      .single(),
  );
}

// ─── loans ────────────────────────────────────────────────────────────────
const LOAN_COLS =
  "id, name, principal, currency, interestRate:interest_rate, loanTermMonths:loan_term_months, startDate:start_date, paymentType:payment_type, monthlyPayment:monthly_payment, createdAt:created_at";

async function listLoans() {
  const ls = unwrap(await supabase.from("loan").select(LOAN_COLS).order("created_at")) as any[];
  return ls.map((l) => {
    const monthsPaid = getMonthsPaid(l.startDate);
    const s = calculateSummary(
      Number(l.principal),
      Number(l.interestRate),
      l.loanTermMonths,
      l.paymentType,
      monthsPaid,
    );
    return {
      ...l,
      monthlyPayment: s.monthlyPayment,
      totalInterest: s.totalInterest,
      remainingBalance: s.remainingBalance,
      monthsPaid,
    };
  });
}
async function loanSchedule(id: string) {
  const l = unwrap(await supabase.from("loan").select(LOAN_COLS).eq("id", id).single()) as any;
  return calculateAmortization(Number(l.principal), Number(l.interestRate), l.loanTermMonths, l.paymentType);
}
async function createLoan(b: Body) {
  const user_id = await getUserId();
  return unwrap(
    await supabase
      .from("loan")
      .insert({
        user_id,
        name: b.name,
        principal: b.principal,
        currency: b.currency || "MYR",
        interest_rate: b.interestRate,
        loan_term_months: b.loanTermMonths,
        start_date: b.startDate,
        payment_type: b.paymentType,
      })
      .select()
      .single(),
  );
}

// ─── dashboard ──────────────────────────────────────────────────────────────
async function getDashboard() {
  const accounts = unwrap(
    await supabase.from("financial_account").select("id, type, balance, isActive:is_active").eq("is_active", true),
  ) as Array<{ type: string; balance: string }>;

  const totalAssets = accounts
    .filter((a) => a.type !== "credit_card" && a.type !== "loan")
    .reduce((s, a) => s + Number(a.balance), 0);
  const totalLiabilities = accounts
    .filter((a) => a.type === "credit_card" || a.type === "loan")
    .reduce((s, a) => s + Math.abs(Number(a.balance)), 0);

  const loans = unwrap(await supabase.from("loan").select("principal")) as Array<{
    principal: string;
  }>;
  const totalLoanBalance = loans.reduce((s, l) => s + Number(l.principal), 0);
  const netWorth = totalAssets - totalLiabilities - totalLoanBalance;

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]!;

  const sumByType = async (type: "income" | "expense") => {
    const rows = unwrap(
      await supabase
        .from("transaction")
        .select("amount")
        .eq("type", type)
        .gte("date", monthStart)
        .lte("date", monthEnd),
    ) as Array<{ amount: string }>;
    return rows.reduce((s, t) => s + Number(t.amount), 0);
  };
  const [monthlyIncome, monthlyExpense] = await Promise.all([sumByType("income"), sumByType("expense")]);

  return {
    netWorth,
    totalAssets,
    totalLiabilities: totalLiabilities + totalLoanBalance,
    monthlyIncome,
    monthlyExpense,
    accountCount: accounts.length,
    loanCount: loans.length,
  };
}

// ─── user settings (key/value) ─────────────────────────────────────────────
async function listSettings(): Promise<Record<string, string>> {
  const rows = unwrap(
    await supabase.from("user_setting").select("key, value"),
  ) as Array<{ key: string; value: string | null }>;
  const out: Record<string, string> = {};
  for (const r of rows) if (r.value != null) out[r.key] = r.value;
  return out;
}

async function upsertSetting(key: string, body: Body) {
  const user_id = await getUserId();
  const value = body.value == null ? null : String(body.value);
  const { error } = await supabase
    .from("user_setting")
    .upsert(
      { user_id, key, value, updated_at: nowIso() },
      { onConflict: "user_id,key" },
    );
  if (error) throw new Error(error.message);
  return { success: true };
}

// ─── generic delete by id ─────────────────────────────────────────────────
async function deleteRow(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}
async function deleteHolding(portfolioId: string, holdingId: string) {
  const { error } = await supabase.from("holding").delete().eq("id", holdingId).eq("portfolio_id", portfolioId);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ─── router ─────────────────────────────────────────────────────────────────
async function route(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: Body): Promise<unknown> {
  const [, resource, p1, p2, p3] = path.split("?")[0]!.split("/");

  switch (resource) {
    case "dashboard":
      return getDashboard();

    case "accounts":
      if (method === "GET") return listAccounts();
      if (method === "POST") return createAccount(body!);
      if (method === "PUT") return updateAccount(p1!, body!);
      if (method === "DELETE") return deleteRow("financial_account", p1!);
      break;

    case "categories":
      if (method === "GET") return listCategories();
      if (method === "POST") return createCategory(body!);
      if (method === "PUT") {
        if (p1 === "reorder") return reorderCategories(body!);
        return updateCategory(p1!, body!);
      }
      if (method === "DELETE") return deleteRow("category", p1!);
      break;

    case "transactions":
      if (method === "GET") return listTransactions();
      if (method === "POST") return createTransaction(body!);
      if (method === "PUT") return updateTransaction(p1!, body!);
      if (method === "DELETE") return deleteTransaction(p1!);
      break;

    case "budgets":
      if (method === "GET") return listBudgets();
      if (method === "POST") return createBudget(body!);
      if (method === "DELETE") return deleteRow("budget", p1!);
      break;

    case "loans":
      if (method === "GET") return p1 && p2 === "schedule" ? loanSchedule(p1) : listLoans();
      if (method === "POST") return createLoan(body!);
      if (method === "DELETE") return deleteRow("loan", p1!);
      break;

    case "portfolios":
      if (method === "GET") return listPortfolios();
      if (method === "POST" && p2 === "holdings") return addHolding(p1!, body!);
      if (method === "POST") return createPortfolio(body!);
      if (method === "PUT" && p2 === "holdings") return updateHolding(p1!, p3!, body!);
      if (method === "DELETE" && p2 === "holdings") return deleteHolding(p1!, p3!);
      if (method === "DELETE") return deleteRow("portfolio", p1!);
      break;

    case "settings":
      // GET /settings        -> { [key]: value }
      // PUT /settings/:key   -> upsert { value: string }
      if (method === "GET") return listSettings();
      if (method === "PUT") return upsertSetting(p1!, body!);
      break;
  }
  throw new Error(`Unhandled API route: ${method} ${path}`);
}

export const api = {
  get: <T>(path: string) => route("GET", path) as Promise<T>,
  post: <T>(path: string, body: unknown) => route("POST", path, body as Body) as Promise<T>,
  put: <T>(path: string, body: unknown) => route("PUT", path, body as Body) as Promise<T>,
  delete: <T>(path: string) => route("DELETE", path) as Promise<T>,
};
