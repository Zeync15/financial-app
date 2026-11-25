import { useEffect, useMemo, useState } from "react";
import { Spin, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PlusOutlined,
  EditOutlined,
  RiseOutlined,
  PercentageOutlined,
  UserOutlined,
  BankOutlined,
  WalletOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";
import EmptyState from "@/components/common/EmptyState";
import { EmojiIcon } from "@/components/common/CategoryIcon";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useFabAction } from "@/hooks/useFabAction";
import { accountEmoji } from "@/lib/typeEmoji";
import {
  Modal,
  FormBody,
  Row,
  Field,
  TextInput,
  AmountInput,
  DateInput,
  Segmented,
  FormFooter,
  useFormState,
} from "@/components/forms/FormKit";

// ─── types ──────────────────────────────────────────────────────────────────
type Scheme = "epf" | "prs" | "other";

interface Plan {
  accountId: string;
  scheme: Scheme;
  birthDate: string | null;
  contributing: boolean;
  monthlySalary: string | null;
  employeeRate: string;
  employerRate: string;
  monthlyAmount: string | null;
  ownRate: string | null;
  persaraan: string | null;
  sejahtera: string | null;
  fleksibel: string | null;
  balanceAsOf: string | null;
}

interface Dividend {
  id: string;
  accountId: string;
  year: number;
  rate: string;
  amount: string | null;
}

interface RetirementAccount {
  id: string;
  name: string;
  currency: string;
  balance: string;
  updatedAt: string;
  plan: Plan | null;
  dividends: Dividend[];
}

const SCHEME_LABEL: Record<Scheme, string> = { epf: "EPF", prs: "PRS", other: "Retirement" };

// EPF's three accounts since May 2024, and the share of new money each gets.
const SPLIT = [
  { key: "persaraan", name: "Persaraan", share: 0.75, color: "#1ec98a", note: "Locked until 55" },
  { key: "sejahtera", name: "Sejahtera", share: 0.15, color: "#4096ff", note: "Housing, education, health" },
  { key: "fleksibel", name: "Fleksibel", share: 0.1, color: "#ffa940", note: "Withdraw any time" },
] as const;

// ─── money and dates ────────────────────────────────────────────────────────
function fmt(n: number) {
  return Math.abs(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
const rm = (n: number) => `${n < 0 ? "− " : ""}RM ${fmt(n)}`;
function rmShort(n: number) {
  if (n >= 1e6) return `RM ${(n / 1e6).toFixed(2)}m`;
  if (n >= 1e3) return `RM ${Math.round(n / 1e3)}k`;
  return `RM ${Math.round(n)}`;
}
const num = (s: string | null | undefined) => (s == null || s === "" ? null : Number(s));

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseYmd(s: string) {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}
function niceDate(s: string) {
  return parseYmd(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
/** Whole months from a to b (negative when b is earlier). */
function monthsBetween(a: Date, b: Date) {
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return m;
}
function ageNow(birth: string) {
  return Math.floor(monthsBetween(parseYmd(birth), new Date()) / 12);
}
/** Months from today until the birthday at `age` (0 once it has passed). */
function monthsToAge(birth: string, age: number) {
  const b = parseYmd(birth);
  const target = new Date(b.getFullYear() + age, b.getMonth(), b.getDate());
  return Math.max(0, monthsBetween(new Date(), target));
}
function yearsMonths(m: number) {
  const y = Math.floor(m / 12);
  const r = m % 12;
  return r ? `${y} yrs ${r} mo` : `${y} yrs`;
}

// ─── what each account works out to ─────────────────────────────────────────
interface Calc {
  balance: number;
  scheme: Scheme;
  monthly: number;
  you: number;
  employer: number;
  paused: boolean;
  /** Dividend years, newest first, that count for the average (up to 5). */
  recent: Dividend[];
  avg: number | null;
  low: number | null;
  high: number | null;
  /** The rate the projection uses: your own, else the average. */
  rate: number | null;
  ownRate: boolean;
  age: number | null;
  to55: number | null;
  to60: number | null;
  /** Monthly balances from today to 60: low, mid, high. */
  paths: { low: number[]; mid: number[]; high: number[] } | null;
  split: { name: string; color: string; note: string; amount: number; pct: number }[] | null;
  splitActual: boolean;
  updated: string | null;
}

function grow(b0: number, monthly: number, ratePct: number, months: number) {
  const r = ratePct / 100 / 12;
  const out = [b0];
  let b = b0;
  for (let i = 0; i < months; i++) {
    b = b * (1 + r) + monthly;
    out.push(b);
  }
  return out;
}

function calc(a: RetirementAccount): Calc {
  const p = a.plan;
  const balance = Number(a.balance);
  const scheme: Scheme = p?.scheme ?? "epf";
  const paused = !!p && !p.contributing;
  const salary = num(p?.monthlySalary) ?? 0;
  const you = p && scheme === "epf" && !paused ? (salary * Number(p.employeeRate)) / 100 : 0;
  const employer = p && scheme === "epf" && !paused ? (salary * Number(p.employerRate)) / 100 : 0;
  const monthly = !p || paused ? 0 : scheme === "epf" ? you + employer : num(p.monthlyAmount) ?? 0;

  const recent = [...a.dividends].sort((x, y) => y.year - x.year).slice(0, 5);
  const rates = recent.map((d) => Number(d.rate));
  const avg = rates.length ? rates.reduce((s, r) => s + r, 0) / rates.length : null;
  const low = rates.length ? Math.min(...rates) : null;
  const high = rates.length ? Math.max(...rates) : null;
  const own = num(p?.ownRate);
  const rate = own ?? avg;

  const age = p?.birthDate ? ageNow(p.birthDate) : null;
  const to55 = p?.birthDate ? monthsToAge(p.birthDate, 55) : null;
  const to60 = p?.birthDate ? monthsToAge(p.birthDate, 60) : null;
  const paths =
    to60 && rate != null
      ? {
          mid: grow(balance, monthly, rate, to60),
          low: grow(balance, monthly, Math.min(low ?? rate, rate), to60),
          high: grow(balance, monthly, Math.max(high ?? rate, rate), to60),
        }
      : null;

  // EPF split: the amounts from the KWSP app while they still add up to the
  // balance; otherwise (never entered, or the balance changed elsewhere since)
  // an estimate at 75 / 15 / 10.
  let split: Calc["split"] = null;
  let splitActual = false;
  if (p && scheme === "epf") {
    const amts = [num(p?.persaraan), num(p?.sejahtera), num(p?.fleksibel)];
    const entered = amts.some((x) => x != null);
    const sum = amts.reduce<number>((s, x) => s + (x ?? 0), 0);
    splitActual = entered && Math.abs(sum - balance) < 0.01 && balance > 0;
    split = SPLIT.map((s, i) => {
      const amount = splitActual ? amts[i] ?? 0 : balance * s.share;
      return { name: s.name, color: s.color, note: s.note, amount, pct: balance > 0 ? (amount / balance) * 100 : s.share * 100 };
    });
  }

  // When the balance was last brought up to date: the statement date, or a
  // later edit made on the Dashboard.
  const edited = a.updatedAt ? ymd(new Date(a.updatedAt)) : null;
  const asOf = p?.balanceAsOf ?? null;
  const updated = asOf && edited ? (asOf > edited ? asOf : edited) : asOf ?? edited;

  return { balance, scheme, monthly, you, employer, paused, recent, avg, low, high, rate, ownRate: own != null, age, to55, to60, paths, split, splitActual, updated };
}

// ─── projection chart ───────────────────────────────────────────────────────
function ProjectionChart({ c, label }: { c: Calc; label: string }) {
  const { paths, to55, to60, age } = c;
  if (!paths || !to60) return null;
  const W = 594;
  const max = Math.max(paths.high[to60]!, paths.mid[to60]!, 1);
  const X = (k: number) => (k / to60) * W;
  const Y = (v: number) => 170 - (v / max) * 150;
  const steps: number[] = [];
  for (let k = 0; k <= to60; k += 6) steps.push(k);
  if (steps[steps.length - 1] !== to60) steps.push(to60);
  const pts = (p: number[]) => steps.map((k) => `${X(k).toFixed(1)} ${Y(p[k]!).toFixed(1)}`);
  const line = "M" + pts(paths.mid).join(" L");
  const band = "M" + pts(paths.high).join(" L") + " L" + pts(paths.low).reverse().join(" L") + " Z";
  const show55 = to55 != null && to55 > 0 && to55 < to60;
  const x55 = show55 ? X(to55!) : 0;
  const font = { fontSize: 13, fontFamily: "inherit" } as const;
  return (
    <svg viewBox="0 0 600 200" width="100%" role="img" aria-label={label} style={{ display: "block" }}>
      <line x1="0" y1="170" x2="600" y2="170" stroke="rgba(255,255,255,0.10)" />
      <path d={band} fill="rgba(30,201,138,0.18)" />
      <path d={line} fill="none" stroke="#1ec98a" strokeWidth={2.5} strokeLinejoin="round" />
      {show55 && (
        <>
          <line x1={x55} y1="14" x2={x55} y2="170" stroke="rgba(255,255,255,0.28)" strokeDasharray="4 4" />
          <circle cx={x55} cy={Y(paths.mid[to55!]!)} r="5" fill="#1ec98a" stroke="#161c23" strokeWidth={2} />
          <text x={x55} y="192" fill="rgba(255,255,255,0.6)" textAnchor="middle" {...font}>
            55
          </text>
        </>
      )}
      <circle cx={W} cy={Y(paths.mid[to60]!)} r="5" fill="#1ec98a" stroke="#161c23" strokeWidth={2} />
      <text x="0" y="192" fill="rgba(255,255,255,0.42)" {...font}>
        {age}
      </text>
      <text x="600" y="192" fill="rgba(255,255,255,0.6)" textAnchor="end" {...font}>
        60
      </text>
    </svg>
  );
}

// ─── small pieces ───────────────────────────────────────────────────────────
function PausedTag() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        padding: "0 7px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
        color: "#e89a3c",
        background: "rgba(250,140,22,0.12)",
        border: "1px solid rgba(250,140,22,0.4)",
      }}
    >
      Paused
    </span>
  );
}

function SubPanel({ title, aside, children }: { title: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18, border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          minHeight: 40,
          padding: "6px 8px 6px 14px",
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--t2)",
          background: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span>{title}</span>
        {aside}
      </div>
      {children}
    </div>
  );
}

function SummaryRows({ rows }: { rows: { label: React.ReactNode; val: string; icon: React.ReactNode; muted?: boolean }[] }) {
  return (
    <>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            paddingBottom: i < rows.length - 1 ? 13 : 0,
            marginBottom: i < rows.length - 1 ? 13 : 0,
            borderBottom: i < rows.length - 1 ? "1px solid var(--line-soft)" : "none",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--t2)", fontSize: 13.5, minWidth: 0 }}>
            <span style={{ color: "var(--t2)" }}>{r.icon}</span>
            {r.label}
          </span>
          <span
            style={{
              color: r.muted ? "var(--t3)" : "var(--t1)",
              fontWeight: 600,
              fontSize: 14.5,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {r.val}
          </span>
        </div>
      ))}
    </>
  );
}

// ─── one account ────────────────────────────────────────────────────────────
function RetirementCard({
  account,
  c,
  isMobile,
  onEdit,
  onDividend,
}: {
  account: RetirementAccount;
  c: Calc;
  isMobile: boolean;
  onEdit: () => void;
  onDividend: (d: Partial<Dividend>) => void;
}) {
  const [open, setOpen] = useState<"none" | "projection" | "dividends">("none");
  const toggle = (v: "projection" | "dividends") => setOpen((o) => (o === v ? "none" : v));
  const p = account.plan;
  const isEpf = c.scheme === "epf";
  const divWord = isEpf ? "Dividends" : "Returns";

  const sub = !p
    ? "No details yet"
    : [
        SCHEME_LABEL[c.scheme],
        c.age != null ? `age ${c.age}` : null,
        c.paused
          ? "not contributing now"
          : isEpf
            ? p.monthlySalary
              ? `${Number(p.employeeRate)}% + ${Number(p.employerRate)}% of ${rm(Number(p.monthlySalary))}`
              : null
            : c.monthly
              ? `${rm(c.monthly)} a month`
              : null,
      ]
        .filter(Boolean)
        .join(" · ");

  // The year EPF declared most recently: last year (announced early this year).
  const lastYear = new Date().getFullYear() - 1;
  const rows: Partial<Dividend>[] = [...account.dividends].sort((x, y) => y.year - x.year);
  const missingLast = !rows.some((d) => d.year === lastYear);
  const divRows: (Partial<Dividend> & { missing?: boolean })[] = missingLast
    ? [{ year: lastYear, missing: true }, ...rows]
    : rows;

  const projectionText = (() => {
    if (!p) return null;
    if (!p.birthDate) return "Add your date of birth to see the projection.";
    if (!c.to60) return "You've reached 60, so there's nothing left to project.";
    if (c.rate == null) return `Add a year to ${divWord} or set your own rate to see the projection.`;
    return null;
  })();

  const assume = (() => {
    if (!c.paths) return "";
    const rateWord = c.ownRate
      ? `your own rate, ${c.rate!.toFixed(2)}%`
      : `your average ${isEpf ? "dividend" : "return"}, ${c.rate!.toFixed(2)}%`;
    const band =
      c.low != null && c.high != null && c.recent.length > 1
        ? ` The band runs from your worst year (${c.low.toFixed(2)}%) to your best (${c.high.toFixed(2)}%).`
        : "";
    const flow = c.paused
      ? " Nothing is going in while you're not contributing, so it grows from dividends only. Turn Contributing now back on when you start work again."
      : ` Assumes ${rm(c.monthly)} goes in every month, with no pay rises.`;
    const caveat = isEpf ? " Dividends are declared each year and are not guaranteed." : " Fund returns go up and down.";
    return `Uses ${rateWord}.${band}${flow}${caveat}`;
  })();

  const at = (months: number | null) => {
    if (!c.paths || months == null || !c.to60) return { val: "—", range: "" };
    if (months === 0) return { val: "Reached", range: "" };
    const range =
      c.recent.length > 1 ? `${rmShort(c.paths.low[months]!)} to ${rmShort(c.paths.high[months]!)}` : "";
    return { val: rm(c.paths.mid[months]!), range };
  };
  const a55 = at(c.to55);
  const a60 = at(c.to60);

  const buttons = (
    <>
      <button
        className="btn-ghost"
        style={isMobile ? { flex: 1, justifyContent: "center", height: 40 } : undefined}
        onClick={() => toggle("projection")}
        disabled={!p}
      >
        <RiseOutlined />
        {open === "projection" ? "Hide" : "Projection"}
      </button>
      <button
        className="btn-ghost"
        style={isMobile ? { flex: 1, justifyContent: "center", height: 40 } : undefined}
        onClick={() => toggle("dividends")}
      >
        <PercentageOutlined />
        {open === "dividends" ? "Hide" : divWord}
      </button>
      <button
        className={isMobile ? "icon-btn" : "icon-btn sm"}
        title="Update balance and details"
        aria-label="Update balance and details"
        onClick={onEdit}
      >
        <EditOutlined />
      </button>
    </>
  );

  return (
    <div className="panel" style={{ padding: isMobile ? 16 : 20, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <EmojiIcon emoji={accountEmoji("retirement")} size={isMobile ? 36 : 40} />
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 14.5 : 16, fontWeight: 600, color: "var(--t1)" }}>{account.name}</div>
          <div style={{ fontSize: isMobile ? 11.5 : 12.5, color: "var(--t3)", marginTop: 2 }}>{sub}</div>
        </div>
        {!isMobile && <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>{buttons}</div>}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(120px, 1fr))",
          gap: isMobile ? 12 : 16,
          marginTop: 18,
        }}
      >
        <div>
          <div className="stat-label">Balance</div>
          <div className="stat-val">{rm(c.balance)}</div>
          {c.updated && (
            <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 2 }}>Updated {niceDate(c.updated)}</div>
          )}
        </div>
        <div>
          <div className="stat-label">Each month</div>
          <div className="stat-val" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {p ? rm(c.monthly) : "—"}
            {c.paused && <PausedTag />}
          </div>
        </div>
        <div>
          <div className="stat-label">At 55</div>
          <div className="stat-val" style={{ color: c.paths ? "var(--pos)" : "var(--t3)" }}>{a55.val}</div>
          {a55.range && <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{a55.range}</div>}
        </div>
        <div>
          <div className="stat-label">At 60</div>
          <div className="stat-val" style={{ color: c.paths ? "var(--pos)" : "var(--t3)" }}>{a60.val}</div>
          {a60.range && <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{a60.range}</div>}
        </div>
      </div>

      {c.split && c.balance > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, marginBottom: 8 }}>
            <span style={{ color: "var(--t2)", fontWeight: 600 }}>Three accounts</span>
            <span style={{ color: "var(--t3)" }}>{c.splitActual ? "Adds up to the balance" : "Estimate: 75 / 15 / 10"}</span>
          </div>
          <div
            role="img"
            aria-label={`Balance split: ${c.split.map((s) => `${s.name} ${s.pct.toFixed(1)}%`).join(", ")}`}
            style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 2 }}
          >
            {c.split.map((s) => (
              <span key={s.name} style={{ width: `${s.pct}%`, background: s.color }} />
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(190px, 1fr))",
              gap: isMobile ? 10 : 18,
              marginTop: 12,
            }}
          >
            {c.split.map((s) => (
              <div key={s.name} style={{ display: "flex", gap: 8, minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, marginTop: 5, background: s.color }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                    <span style={{ color: "var(--t2)" }}>
                      {s.name} <span style={{ color: "var(--t4)" }}>· {s.pct.toFixed(1)}%</span>
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--t1)", fontVariantNumeric: "tabular-nums" }}>{rm(s.amount)}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--t3)" }}>{s.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!p && (
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "var(--t3)" }}>
            Add your details to see what goes in each month and the projection.
          </span>
          <button className="btn-ghost" onClick={onEdit}>
            <EditOutlined />
            Add details
          </button>
        </div>
      )}

      {isMobile && <div style={{ display: "flex", gap: 8, marginTop: 16 }}>{buttons}</div>}

      {open === "projection" && p && (
        <SubPanel
          title="Projection to 60"
          aside={
            c.paths ? (
              <span style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 400, color: "var(--t3)", fontSize: 11.5, paddingRight: 6 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 14, height: 3, borderRadius: 2, background: "#1ec98a" }} />
                  {c.ownRate ? "Your rate" : "Average"} {c.rate!.toFixed(2)}%
                </span>
                {c.recent.length > 1 && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 14, height: 10, borderRadius: 3, background: "rgba(30,201,138,0.22)" }} />
                    {c.low!.toFixed(2)}% to {c.high!.toFixed(2)}%
                  </span>
                )}
              </span>
            ) : undefined
          }
        >
          {projectionText ? (
            <div style={{ padding: 14, fontSize: 12.5, color: "var(--t3)" }}>{projectionText}</div>
          ) : (
            <>
              <div style={{ padding: "14px 14px 6px" }}>
                <ProjectionChart
                  c={c}
                  label={`${account.name} projected from ${rm(c.balance)} now to ${a55.val} at 55 and ${a60.val} at 60`}
                />
              </div>
              <div style={{ padding: "0 14px 12px", fontSize: 11.5, color: "var(--t3)", lineHeight: 1.5 }}>{assume}</div>
            </>
          )}
        </SubPanel>
      )}

      {open === "dividends" && (
        <SubPanel
          title={isEpf ? "Dividends declared" : "Yearly returns"}
          aside={
            <button className="btn-ghost" style={{ height: 28 }} onClick={() => onDividend({})}>
              <PlusOutlined />
              Add year
            </button>
          }
        >
          <table className="lg-table">
            <thead>
              <tr>
                <th>Year</th>
                <th className="num">Rate</th>
                <th className="num">Credited</th>
              </tr>
            </thead>
            <tbody>
              {divRows.map((d) => (
                <tr
                  key={d.year}
                  onClick={() => onDividend(d.missing ? { year: d.year } : d)}
                  style={{ cursor: "pointer" }}
                  title={d.missing ? `Add ${d.year}` : `Edit ${d.year}`}
                >
                  <td>{d.year}</td>
                  <td className="num" style={{ color: d.missing ? "var(--t3)" : "var(--t1)" }}>
                    {d.missing ? "Not entered" : `${Number(d.rate).toFixed(2)}%`}
                  </td>
                  <td className="num" style={{ color: d.missing || d.amount == null ? "var(--t3)" : "var(--pos)" }}>
                    {d.missing || d.amount == null ? "—" : `+ ${rm(Number(d.amount))}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "9px 14px", fontSize: 11.5, color: "var(--t3)", borderTop: "1px solid var(--line-soft)" }}>
            {c.avg == null
              ? `No years yet. Add them from the ${isEpf ? "KWSP announcements" : "fund's reports"}.`
              : `Average ${c.avg.toFixed(2)}% over ${c.recent.length} ${c.recent.length === 1 ? "year" : "years"}${
                  c.ownRate ? ". The projection uses your own rate instead." : ", used for the projection."
                }`}
          </div>
        </SubPanel>
      )}
    </div>
  );
}

// ─── details form (new and edit) ────────────────────────────────────────────
interface FormState {
  name: string;
  scheme: Scheme;
  birthDate: string;
  contributing: boolean;
  monthlySalary: string;
  employeeRate: string;
  employerRate: string;
  monthlyAmount: string;
  rateMode: "avg" | "own";
  ownRate: string;
  persaraan: string;
  sejahtera: string;
  fleksibel: string;
  balance: string;
  balanceAsOf: string;
}

const str = (s: string | null | undefined) => (s == null ? "" : String(Number(s)));

function initialForm(a: RetirementAccount | null): FormState {
  const p = a?.plan;
  return {
    name: a?.name ?? "",
    scheme: p?.scheme ?? "epf",
    birthDate: p?.birthDate ?? "",
    contributing: p?.contributing ?? true,
    monthlySalary: str(p?.monthlySalary),
    employeeRate: p ? str(p.employeeRate) : "11",
    employerRate: p ? str(p.employerRate) : "",
    monthlyAmount: str(p?.monthlyAmount),
    rateMode: p?.ownRate != null ? "own" : "avg",
    ownRate: str(p?.ownRate),
    persaraan: str(p?.persaraan),
    sejahtera: str(p?.sejahtera),
    fleksibel: str(p?.fleksibel),
    balance: a ? str(a.balance) : "",
    balanceAsOf: p?.balanceAsOf ?? ymd(new Date()),
  };
}

function ContributingSwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        minHeight: 56,
        padding: "10px 14px",
        border: "1px solid var(--line)",
        borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
        color: "inherit",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>Contributing now</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--t3)", marginTop: 2 }}>
          {on ? "Money goes in every month." : "Nothing goes in. The balance still earns dividends."}
        </span>
      </span>
      <span
        aria-hidden
        style={{
          position: "relative",
          width: 36,
          height: 20,
          flex: "0 0 auto",
          borderRadius: 999,
          background: on ? "var(--accent)" : "rgba(255,255,255,0.3)",
          transition: "background 0.15s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.15s",
          }}
        />
      </span>
    </button>
  );
}

function RetirementForm({
  open,
  account,
  onClose,
  onSaved,
}: {
  open: boolean;
  account: RetirementAccount | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !account;
  const init = useMemo(() => initialForm(account), [account]);
  const { state, set, setState } = useFormState<FormState>(open, init);
  const [asOfTouched, setAsOfTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setAsOfTouched(false);
  }, [open]);

  const c = account ? calc(account) : null;
  const isEpf = state.scheme === "epf";
  const salary = Number(state.monthlySalary) || 0;

  // Typing a new balance dates it today, unless the date was set by hand.
  const setAmount = (k: "persaraan" | "sejahtera" | "fleksibel" | "balance", v: string) =>
    setState((s) => ({ ...s, [k]: v, balanceAsOf: asOfTouched ? s.balanceAsOf : ymd(new Date()) }));

  const epfParts = [state.persaraan, state.sejahtera, state.fleksibel];
  const epfEntered = epfParts.some((x) => x !== "");
  const epfTotal = epfParts.reduce((s, x) => s + (Number(x) || 0), 0);

  const submit = async () => {
    if (isNew && !state.name.trim()) {
      message.error("Give the account a name");
      return;
    }
    if (!state.birthDate) {
      message.error("Date of birth is needed for the projection");
      return;
    }
    if (isEpf && state.contributing && !state.monthlySalary) {
      message.error("Enter your monthly salary, or turn Contributing now off");
      return;
    }
    if (state.rateMode === "own" && !state.ownRate) {
      message.error("Enter your own rate, or use your average");
      return;
    }

    // Only send a balance when it changed here, so opening and saving the form
    // doesn't re-date a balance nobody touched.
    const balanceChanged = isEpf
      ? epfParts.some((x, i) => x !== [init.persaraan, init.sejahtera, init.fleksibel][i]) || (asOfTouched && state.balanceAsOf !== init.balanceAsOf)
      : state.balance !== init.balance || (asOfTouched && state.balanceAsOf !== init.balanceAsOf);
    let balance: number | null = null;
    if (isEpf && epfEntered && (balanceChanged || isNew)) balance = epfTotal;
    if (!isEpf && state.balance !== "" && (balanceChanged || isNew)) balance = Number(state.balance);

    setSaving(true);
    try {
      await api.post("/retirement", {
        accountId: account?.id ?? null,
        name: state.name.trim(),
        balance: balance == null ? null : balance.toFixed(4),
        balanceAsOf: balance == null ? null : state.balanceAsOf,
        plan: {
          scheme: state.scheme,
          birthDate: state.birthDate,
          contributing: state.contributing,
          monthlySalary: isEpf ? state.monthlySalary : "",
          employeeRate: isEpf ? state.employeeRate || "11" : "11",
          employerRate: isEpf ? state.employerRate || (salary > 5000 ? "12" : "13") : "13",
          monthlyAmount: isEpf ? "" : state.monthlyAmount,
          ownRate: state.rateMode === "own" ? state.ownRate : "",
          persaraan: isEpf ? state.persaraan : "",
          sejahtera: isEpf ? state.sejahtera : "",
          fleksibel: isEpf ? state.fleksibel : "",
        },
      });
      message.success(isNew ? "Account added" : "Saved");
      window.dispatchEvent(new Event("transaction-added"));
      onSaved();
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const balanceBlock = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--t1)" }}>
          {isEpf ? "Balance from the KWSP app" : "Balance"}
        </div>
        <div className="field-hint" style={{ marginTop: 2 }}>
          {isEpf
            ? "Type the three accounts. Their total becomes this account’s balance, on the Dashboard too."
            : "From your latest statement. It becomes this account’s balance, on the Dashboard too."}
        </div>
      </div>
      {isEpf ? (
        <>
          <Row>
            <Field label="Persaraan">
              <AmountInput value={state.persaraan} onChange={(v) => setAmount("persaraan", v)} maxDecimals={2} />
            </Field>
            <Field label="Sejahtera">
              <AmountInput value={state.sejahtera} onChange={(v) => setAmount("sejahtera", v)} maxDecimals={2} />
            </Field>
          </Row>
          <Row>
            <Field label="Fleksibel">
              <AmountInput value={state.fleksibel} onChange={(v) => setAmount("fleksibel", v)} maxDecimals={2} />
            </Field>
            <Field label="As Of" required>
              <DateInput
                value={state.balanceAsOf}
                onChange={(v) => {
                  setAsOfTouched(true);
                  set("balanceAsOf", v);
                }}
              />
            </Field>
          </Row>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--line-soft)",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--t2)" }}>{epfEntered ? "New balance" : "Balance stays"}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)", fontVariantNumeric: "tabular-nums" }}>
              {epfEntered ? rm(epfTotal) : account ? rm(Number(account.balance)) : rm(0)}
            </span>
          </div>
        </>
      ) : (
        <Row>
          <Field label="Balance">
            <AmountInput value={state.balance} onChange={(v) => setAmount("balance", v)} maxDecimals={2} />
          </Field>
          <Field label="As Of" required>
            <DateInput
              value={state.balanceAsOf}
              onChange={(v) => {
                setAsOfTouched(true);
                set("balanceAsOf", v);
              }}
            />
          </Field>
        </Row>
      )}
    </div>
  );

  const schemeAndBirth = (
    <Row>
      <Field label="Scheme" required>
        <Segmented<Scheme>
          value={state.scheme}
          onChange={(v) => set("scheme", v)}
          options={[
            { value: "epf", label: "EPF" },
            { value: "prs", label: "PRS" },
            { value: "other", label: "Other" },
          ]}
        />
      </Field>
      <Field label="Date of Birth" required hint={state.birthDate ? `Age ${ageNow(state.birthDate)}` : undefined}>
        <DateInput value={state.birthDate} onChange={(v) => set("birthDate", v)} />
      </Field>
    </Row>
  );

  const avgHint = (() => {
    if (!c || c.avg == null) return `No ${isEpf ? "dividends" : "returns"} entered yet. Add years on the card, or use your own rate.`;
    const n = c.recent.length;
    const range = n > 1 ? ` The band shows your worst year (${c.low!.toFixed(2)}%) to your best (${c.high!.toFixed(2)}%).` : "";
    return `${c.avg.toFixed(2)}% a year, the average of the ${n === 1 ? "year" : `${n} years`} in ${isEpf ? "Dividends" : "Returns"}.${range} Updates by itself when you add a year.`;
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? "New Retirement Account" : account!.name}
      icon={isNew ? "plus" : "pencil"}
      width={600}
      fullscreen
    >
      <FormBody>
        <div className="rt-form" style={{ display: "contents" }} />
        {isNew && (
          <>
            <Field label="Name" required>
              <TextInput value={state.name} onChange={(v) => set("name", v)} placeholder="e.g. EPF (KWSP)" autoFocus />
            </Field>
            {schemeAndBirth}
          </>
        )}

        {balanceBlock}

        <ContributingSwitch on={state.contributing} onChange={(v) => set("contributing", v)} />

        {state.contributing &&
          (isEpf ? (
            <>
              <Field label="Monthly Salary" required>
                <AmountInput value={state.monthlySalary} onChange={(v) => set("monthlySalary", v)} maxDecimals={2} />
              </Field>
              <Row>
                <Field
                  label="Your Share"
                  required
                  hint={salary ? `${rm((salary * (Number(state.employeeRate) || 0)) / 100)} a month` : "Usually 11%"}
                >
                  <TextInput value={state.employeeRate} onChange={(v) => set("employeeRate", v)} placeholder="11" maxDecimals={2} />
                </Field>
                <Field label="Employer" required hint="13% up to RM 5,000 salary, 12% above">
                  <TextInput
                    value={state.employerRate}
                    onChange={(v) => set("employerRate", v)}
                    placeholder={salary > 5000 ? "12" : "13"}
                    maxDecimals={2}
                  />
                </Field>
              </Row>
            </>
          ) : (
            <Field label="Each Month" hint="What you put in every month">
              <AmountInput value={state.monthlyAmount} onChange={(v) => set("monthlyAmount", v)} maxDecimals={2} />
            </Field>
          ))}

        <Field label={isEpf ? "Dividend for the Projection" : "Return for the Projection"}>
          <Segmented<"avg" | "own">
            value={state.rateMode}
            onChange={(v) => set("rateMode", v)}
            options={[
              { value: "avg", label: "Your average" },
              { value: "own", label: "Your own rate" },
            ]}
          />
          {state.rateMode === "avg" ? (
            <div className="field-hint" style={{ marginTop: 6 }}>{avgHint}</div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <TextInput value={state.ownRate} onChange={(v) => set("ownRate", v)} placeholder="e.g. 5.00" maxDecimals={2} />
              <div className="field-hint" style={{ marginTop: 6 }}>
                % a year, used instead of your average. The band still shows your worst and best years.
              </div>
            </div>
          )}
        </Field>

        {!isNew && (
          <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 16 }}>{schemeAndBirth}</div>
        )}
      </FormBody>
      <FormFooter primary={isNew ? "Add Account" : "Save Changes"} onPrimary={submit} onCancel={onClose} loading={saving} />
    </Modal>
  );
}

// ─── one dividend year ──────────────────────────────────────────────────────
function DividendForm({
  open,
  account,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  account: RetirementAccount | null;
  editing: Partial<Dividend> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEpf = (account?.plan?.scheme ?? "epf") === "epf";
  const { state, set } = useFormState(open, {
    year: editing?.year ? String(editing.year) : String(new Date().getFullYear() - 1),
    rate: editing?.rate != null ? String(Number(editing.rate)) : "",
    amount: editing?.amount != null ? String(Number(editing.amount)) : "",
  });
  const [saving, setSaving] = useState(false);
  const existing = !!editing?.id;

  const submit = async () => {
    const year = Number(state.year);
    if (!year || year < 1950 || year > 2200) {
      message.error("Enter the year, e.g. 2025");
      return;
    }
    if (state.rate === "") {
      message.error(`Enter the ${isEpf ? "dividend" : "return"} rate`);
      return;
    }
    setSaving(true);
    try {
      await api.post(`/retirement/${account!.id}/dividends`, {
        id: editing?.id,
        year,
        rate: state.rate,
        amount: state.amount,
      });
      message.success(existing ? "Year updated" : "Year added");
      onSaved();
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/retirement/${account!.id}/dividends/${editing!.id}`);
      message.success("Year removed");
      onSaved();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? `${isEpf ? "Dividend" : "Return"} for ${editing!.year}` : `Add a ${isEpf ? "Dividend" : "Return"}`}
      icon={existing ? "pencil" : "plus"}
      fullscreen
    >
      <FormBody>
        <Row>
          <Field label="Year" required>
            <TextInput value={state.year} onChange={(v) => set("year", v)} placeholder="2025" maxDecimals={0} />
          </Field>
          <Field label="Rate" required hint="% for that year">
            <TextInput value={state.rate} onChange={(v) => set("rate", v)} placeholder="e.g. 6.30" maxDecimals={3} autoFocus />
          </Field>
        </Row>
        <Field label="Credited" hint="Optional: the amount that year added to your account">
          <AmountInput value={state.amount} onChange={(v) => set("amount", v)} maxDecimals={2} />
        </Field>
      </FormBody>
      <FormFooter
        primary={existing ? "Save Changes" : "Add Year"}
        onPrimary={submit}
        onCancel={onClose}
        loading={saving}
        danger={existing ? "Remove" : undefined}
        onDanger={existing ? remove : undefined}
        confirm={
          existing
            ? {
                title: `Remove ${editing!.year}?`,
                content: `The ${Number(editing!.rate).toFixed(2)}% for ${editing!.year} comes out of the history and the average. The balance doesn’t change.`,
              }
            : undefined
        }
      />
    </Modal>
  );
}

// ─── page ───────────────────────────────────────────────────────────────────
export default function Retirement() {
  const [accounts, setAccounts] = useState<RetirementAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  // /retirement/new and /retirement/:id/edit open the form (a full-screen page
  // on phone, so the back gesture closes it); closing goes back to /retirement.
  const wantsNew = location.pathname === "/retirement/new";
  const editId = location.pathname.match(/^\/retirement\/([^/]+)\/edit$/)?.[1] ?? null;
  const editing = editId ? accounts.find((a) => a.id === editId) ?? null : null;
  const formOpen = wantsNew || !!editing;
  const closeForm = () => navigate("/retirement", { replace: true });

  // /retirement/:id/dividend?id=… (edit a year) or ?year=… (add one) opens the
  // dividend form, also a full-screen page on phone.
  const divAccountId = location.pathname.match(/^\/retirement\/([^/]+)\/dividend$/)?.[1] ?? null;
  const divAccount = divAccountId ? accounts.find((a) => a.id === divAccountId) ?? null : null;
  const divParams = new URLSearchParams(location.search);
  const divEditing: Partial<Dividend> | null = divAccount
    ? divAccount.dividends.find((d) => d.id === divParams.get("id")) ??
      (divParams.get("year") ? { year: Number(divParams.get("year")) } : {})
    : null;
  const openDividend = (a: RetirementAccount, d: Partial<Dividend>) =>
    navigate(`/retirement/${a.id}/dividend${d.id ? `?id=${d.id}` : d.year ? `?year=${d.year}` : ""}`);

  useFabAction(() => navigate("/retirement/new"));

  const load = () =>
    api
      .get<RetirementAccount[]>("/retirement")
      .then(setAccounts)
      .catch((e) => message.error(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("transaction-added", onChange);
    return () => window.removeEventListener("transaction-added", onChange);
  }, []);

  const calcs = useMemo(() => new Map(accounts.map((a) => [a.id, calc(a)])), [accounts]);

  if (loading) return <Spin size="large" className="flex justify-center mt-20" />;

  const list = accounts.map((a) => ({ a, c: calcs.get(a.id)! }));
  const total = list.reduce((s, x) => s + x.c.balance, 0);
  const monthlyTotal = list.reduce((s, x) => s + x.c.monthly, 0);
  const epfs = list.filter((x) => x.c.scheme === "epf" && x.a.plan);

  // Latest declared EPF dividend, for the line under the total.
  const latestDiv = epfs
    .flatMap((x) => x.a.dividends)
    .sort((x, y) => y.year - x.year)[0];

  const inRows: { label: React.ReactNode; val: string; icon: React.ReactNode; muted?: boolean }[] = [];
  for (const { a, c } of list) {
    if (!a.plan) continue;
    const prefix = list.filter((x) => x.a.plan).length > 1 ? `${a.name}: ` : "";
    const label = (text: string) => (
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
        {c.paused && <PausedTag />}
      </span>
    );
    if (c.scheme === "epf") {
      inRows.push({
        label: label(c.paused ? `${prefix}You` : `${prefix}You, ${Number(a.plan.employeeRate)}% of salary`),
        val: rm(c.you),
        icon: <UserOutlined />,
        muted: c.paused,
      });
      inRows.push({
        label: label(c.paused ? `${prefix}Employer` : `${prefix}Employer, ${Number(a.plan.employerRate)}%`),
        val: rm(c.employer),
        icon: <BankOutlined />,
        muted: c.paused,
      });
    } else {
      inRows.push({ label: label(a.name), val: rm(c.monthly), icon: <WalletOutlined />, muted: c.paused });
    }
  }

  const firstEpfWithDivs = epfs.find((x) => x.c.avg != null);
  const firstWithBirth = list.find((x) => x.c.to55 != null);
  const factRows: { label: React.ReactNode; val: string; icon: React.ReactNode }[] = [];
  if (firstEpfWithDivs)
    factRows.push({
      label: `EPF dividend, ${firstEpfWithDivs.c.recent.length}-year average`,
      val: `${firstEpfWithDivs.c.avg!.toFixed(2)}%`,
      icon: <PercentageOutlined />,
    });
  if (firstWithBirth)
    factRows.push({
      label: "Years to 55",
      val: firstWithBirth.c.to55 ? yearsMonths(firstWithBirth.c.to55) : "Reached",
      icon: <CalendarOutlined />,
    });
  if (!isMobile) factRows.push({ label: "Accounts", val: String(accounts.length), icon: <UnorderedListOutlined /> });

  const hero = (
    <div className="panel" style={{ padding: "18px 20px" }}>
      <div className="stat-label">Total retirement savings</div>
      <div
        style={{
          fontSize: isMobile ? 27 : 30,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: "var(--t1)",
          fontVariantNumeric: "tabular-nums",
          margin: latestDiv ? "3px 0 13px" : "3px 0 0",
        }}
      >
        {rm(total)}
      </div>
      {latestDiv && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="pill up">
            <RiseOutlined />
            {Number(latestDiv.rate).toFixed(2)}%
          </span>
          <span style={{ color: "var(--t3)", fontSize: 12.5 }}>
            EPF dividend for {latestDiv.year}
            {latestDiv.amount != null && (
              <>
                ,{" "}
                <b style={{ color: "var(--pos)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  + {rm(Number(latestDiv.amount))}
                </b>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );

  const monthlyPanel = inRows.length > 0 && (
    <div className="panel" style={{ padding: isMobile ? 16 : "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--t2)" }}>Going in each month</span>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--t1)", fontVariantNumeric: "tabular-nums" }}>
          {rm(monthlyTotal)}
        </span>
      </div>
      <SummaryRows rows={inRows} />
    </div>
  );

  const factsPanel = factRows.length > 0 && (
    <div className="panel" style={{ padding: isMobile ? 16 : "18px 20px" }}>
      <SummaryRows rows={factRows} />
    </div>
  );

  const cards = list.map(({ a, c }) => (
    <RetirementCard
      key={a.id}
      account={a}
      c={c}
      isMobile={isMobile}
      onEdit={() => navigate(`/retirement/${a.id}/edit`)}
      onDividend={(d) => openDividend(a, d)}
    />
  ));

  return (
    <div>
      <div className="titlebar">
        <h1 className="h1" style={{ fontSize: isMobile ? 22 : 26 }}>
          Retirement
        </h1>
        {!isMobile && (
          <button className="btn-primary-emerald" onClick={() => navigate("/retirement/new")}>
            <PlusOutlined />
            Add Account
          </button>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="panel">
          <EmptyState emoji={accountEmoji("retirement")}>
            No retirement accounts yet. Add your EPF or PRS{isMobile ? " with the + button" : ""}.
          </EmptyState>
        </div>
      ) : isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {hero}
          <div>{cards}</div>
          {monthlyPanel}
          {factsPanel}
        </div>
      ) : (
        <div className="rt-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {hero}
            {monthlyPanel}
            {factsPanel}
          </div>
          <div>{cards}</div>
        </div>
      )}

      <RetirementForm
        // A fresh form per account, so it opens with that account's values
        // instead of showing the last one's for a frame.
        key={editing?.id ?? (wantsNew ? "new" : "closed")}
        open={formOpen}
        account={editing}
        onClose={closeForm}
        onSaved={() => {
          closeForm();
          load();
        }}
      />
      <DividendForm
        key={location.pathname + location.search}
        open={!!divAccount}
        account={divAccount}
        editing={divEditing}
        onClose={closeForm}
        onSaved={() => {
          closeForm();
          load();
        }}
      />
    </div>
  );
}
