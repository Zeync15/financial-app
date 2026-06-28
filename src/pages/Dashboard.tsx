import { useEffect, useMemo, useState } from "react";
import { Spin, Empty, message } from "antd";
import {
  DollarOutlined,
  BankOutlined,
  RiseOutlined,
  PlusOutlined,
  SaveOutlined,
  CreditCardOutlined,
  MobileOutlined,
  FundOutlined,
  FileTextOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import IconCircle from "@/components/common/IconCircle";
import {
  Modal,
  FormBody,
  Row,
  Field,
  TextInput,
  AmountInput,
  SelectInput,
  FormFooter,
  useFormState,
} from "@/components/forms/FormKit";

interface DashboardData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpense: number;
  accountCount: number;
  loanCount: number;
}

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  institution: string | null;
  balance: string;
  isActive: boolean;
}

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit Card" },
  { value: "cash", label: "Cash" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "investment", label: "Investment" },
  { value: "loan", label: "Loan" },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  checking: <BankOutlined />,
  savings: <SaveOutlined />,
  credit_card: <CreditCardOutlined />,
  cash: <DollarOutlined />,
  ewallet: <MobileOutlined />,
  investment: <FundOutlined />,
  loan: <FileTextOutlined />,
};

const TYPE_COLORS: Record<string, string> = {
  checking: "#1677ff",
  savings: "#52c41a",
  credit_card: "#ff4d4f",
  cash: "#fa8c16",
  ewallet: "#722ed1",
  investment: "#13c2c2",
  loan: "#fa541c",
};

const ASSET_TYPES = new Set(["checking", "savings", "cash", "ewallet", "investment"]);

// High-level groupings shown on the Accounts tab. Group totals reflect each
// row at face value — the "Loans & Instalments" total is rendered negative.
const ACCOUNT_GROUPS: {
  id: string;
  title: string;
  types: string[];
  negative?: boolean;
}[] = [
  {
    id: "banking",
    title: "Banking & Cash",
    types: ["checking", "savings", "cash", "ewallet"],
  },
  { id: "investments", title: "Investments", types: ["investment"] },
  {
    id: "loans",
    title: "Loans & Instalments",
    types: ["credit_card", "loan"],
    negative: true,
  },
];

const CUR_OPTS = ["MYR", "USD", "SGD", "EUR", "GBP", "JPY", "CNY"];

function fmt(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function fmt0(n: number) {
  return Math.round(n).toLocaleString();
}

interface AccountFormState {
  name: string;
  type: string;
  institution: string;
  currency: string;
  balance: string;
}

function AccountModal({
  open,
  editing,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  editing: Account | null;
  onClose: () => void;
  onSubmit: (v: AccountFormState) => Promise<void>;
  onDelete?: () => void;
}) {
  const initial: AccountFormState = useMemo(
    () => ({
      name: editing?.name ?? "",
      type: editing?.type ?? "savings",
      institution: editing?.institution ?? "",
      currency: editing?.currency ?? "MYR",
      balance: editing ? String(Number(editing.balance)) : "0",
    }),
    [editing],
  );
  const { state, set, setState } = useFormState<AccountFormState>(open, initial);
  useEffect(() => {
    if (open) setState(initial);
  }, [open, initial, setState]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!state.name || !state.type) {
      message.error("Name and type are required");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(state);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit Account" : "New Account"}
      icon={editing ? "pencil" : "plus"}
    >
      <FormBody>
        <Field label="Name" required>
          <TextInput value={state.name} onChange={(v) => set("name", v)} placeholder="e.g. Maybank Savings" autoFocus />
        </Field>
        <Field label="Type" required>
          <SelectInput value={state.type} onChange={(v) => set("type", v)} options={ACCOUNT_TYPES} />
        </Field>
        <Field label="Institution">
          <TextInput value={state.institution} onChange={(v) => set("institution", v)} placeholder="e.g. Maybank" />
        </Field>
        <Row>
          <Field label="Currency" required>
            <SelectInput value={state.currency} onChange={(v) => set("currency", v)} options={CUR_OPTS} />
          </Field>
          <Field label="Balance" required>
            <AmountInput value={state.balance} onChange={(v) => set("balance", v)} currency={state.currency} />
          </Field>
        </Row>
      </FormBody>
      <FormFooter
        primary={editing ? "Save Changes" : "Add Account"}
        onPrimary={submit}
        onCancel={onClose}
        loading={saving}
        danger={editing ? "Delete" : undefined}
        onDanger={editing ? onDelete : undefined}
      />
    </Modal>
  );
}

// DB-backed user setting key for the DSR denominator.
// Falls back to actual /dashboard.monthlyIncome when unset.
const INCOME_SETTING_KEY = "net_monthly_income";
function parseStoredIncome(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Simple balance-scale icon used in the DSR mini-stat + modal header.
const ScaleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="1em"
    height="1em"
  >
    <path d="M12 4v17M5 21h14M6 8h12M6 8l-3 7a3 3 0 0 0 6 0L6 8zM18 8l-3 7a3 3 0 0 0 6 0L18 8z" />
  </svg>
);

function IncomeModal({
  open,
  onClose,
  value,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  value: number;
  onSave: (n: number) => void | Promise<void>;
}) {
  const [v, setV] = useState(String(value || ""));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setV(String(value || ""));
  }, [open, value]);

  const commit = async () => {
    const n = Number(String(v).replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      message.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await onSave(n);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Net monthly income"
      icon={<ScaleIcon />}
      width={460}
    >
      <FormBody>
        <Field
          label="Net monthly income"
          required
          hint="Take-home pay after tax and deductions. Used to calculate your debt service ratio."
        >
          <AmountInput value={v} onChange={setV} />
        </Field>
      </FormBody>
      <FormFooter
        primary="Save"
        onPrimary={commit}
        onCancel={onClose}
        loading={saving}
      />
    </Modal>
  );
}

function MiniStat({
  label,
  value,
  color,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  color?: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={"panel" + (onClick ? " stat-click" : "")}
      style={{ padding: "16px 18px", flex: 1 }}
      onClick={onClick}
    >
      <div className="kpi-lbl">
        <span style={{ color: color ?? "var(--t3)", display: "inline-flex" }}>{icon}</span>
        {label}
      </div>
      <div className="kpi-val" style={{ fontSize: 22, color: color ?? "var(--t1)" }}>
        {value}
      </div>
    </div>
  );
}

const DEBT_TYPES = new Set(["credit_card", "loan"]);

function AcctRow({ a, onClick, showBorder }: { a: Account; onClick: () => void; showBorder: boolean }) {
  const color = TYPE_COLORS[a.type] ?? "#8c8c8c";
  const icon = TYPE_ICONS[a.type] ?? <BankOutlined />;
  const raw = Number(a.balance);
  const isDebt = DEBT_TYPES.has(a.type);
  // Debt-type rows are stored as positive magnitudes but read as negative.
  const balance = isDebt ? -Math.abs(raw) : raw;
  const typeLabel = ACCOUNT_TYPES.find((t) => t.value === a.type)?.label ?? a.type;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 18px",
        cursor: "pointer",
        borderBottom: showBorder ? "1px solid var(--line-soft)" : "none",
      }}
    >
      <IconCircle icon={icon} color={color} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--t1)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {a.name}
        </div>
        <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>
          {typeLabel}
          {a.institution ? ` · ${a.institution}` : ""}
        </div>
      </div>
      <div
        style={{
          flex: "0 0 auto",
          color: balance < 0 ? "var(--neg)" : "var(--t1)",
          fontWeight: 600,
          fontSize: 14,
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
        }}
      >
        {balance < 0 ? "−" : ""}
        {a.currency}{" "}
        {Math.abs(balance).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  );
}

function Donut({
  size = 190,
  thick = 24,
  data,
}: {
  size?: number;
  thick?: number;
  data: { color: string; pct: number }[];
}) {
  const r = (size - thick) / 2;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thick} />
      {data.map((d, i) => {
        const len = (d.pct / 100) * c;
        const seg = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={thick}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-off}
          />
        );
        off += len;
        return seg;
      })}
    </svg>
  );
}

interface LoanLite {
  id: string;
  monthlyPayment: number;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loans, setLoans] = useState<LoanLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [tab, setTab] = useState<"accounts" | "allocation">("accounts");
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [incomeOverride, setIncomeOverride] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const load = () => {
    setLoading(true);
    return Promise.all([
      api.get<DashboardData>("/dashboard"),
      api.get<Account[]>("/accounts"),
      api.get<LoanLite[]>("/loans"),
      api.get<Record<string, string>>("/settings"),
    ])
      .then(([d, a, l, s]) => {
        setData(d);
        setAccounts(a);
        setLoans(l);
        setIncomeOverride(parseStoredIncome(s[INCOME_SETTING_KEY]));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (acc: Account) => {
    setEditing(acc);
    setModalOpen(true);
  };

  const handleSubmit = async (v: AccountFormState) => {
    try {
      if (editing) {
        await api.put(`/accounts/${editing.id}`, {
          ...v,
          balance: String(v.balance),
          isActive: editing.isActive,
        });
        message.success("Account updated");
      } else {
        await api.post("/accounts", {
          ...v,
          balance: String(v.balance || 0),
        });
        message.success("Account created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await api.delete(`/accounts/${editing.id}`);
      message.success("Account deleted");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  // Group accounts into the three high-level buckets. Each row inside a
  // group keeps its own type icon/colour; only the group total is aggregated.
  const groups = useMemo(() => {
    return ACCOUNT_GROUPS.map((g) => {
      const list = accounts.filter(
        (a) => a.isActive && g.types.includes(a.type),
      );
      const sum = list.reduce((s, a) => s + Number(a.balance), 0);
      return {
        ...g,
        accounts: list,
        // For credit cards/loans we display debt as a positive magnitude,
        // then prefix the group total with a minus sign and render red.
        total: g.negative ? -Math.abs(sum) : sum,
      };
    }).filter((g) => g.accounts.length > 0);
  }, [accounts]);

  // Allocation: by type, MYR-treating balances at face value.
  const allocation = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of accounts) {
      if (!a.isActive) continue;
      if (!ASSET_TYPES.has(a.type)) continue;
      const bal = Number(a.balance);
      if (bal <= 0) continue;
      map.set(a.type, (map.get(a.type) ?? 0) + bal);
    }
    const total = [...map.values()].reduce((s, v) => s + v, 0) || 1;
    return ACCOUNT_TYPES.filter(({ value }) => map.has(value)).map(({ value, label }) => {
      const val = map.get(value)!;
      return {
        type: value,
        label,
        val,
        pct: Math.round((val / total) * 100),
        color: TYPE_COLORS[value] ?? "#8c8c8c",
      };
    });
  }, [accounts]);

  if (loading && !data) {
    return <Spin size="large" className="flex justify-center mt-20" />;
  }

  const netWorth = data?.netWorth ?? 0;
  const totalAssets = data?.totalAssets ?? 0;
  const totalLiabilities = data?.totalLiabilities ?? 0;
  const monthlyIncome = data?.monthlyIncome ?? 0;
  const monthlyExpense = data?.monthlyExpense ?? 0;
  const monthlyNet = monthlyIncome - monthlyExpense;
  // Yearly gain = annualised monthly net (no historical snapshots yet).
  const yearlyGain = monthlyNet * 12;
  // DSR = monthly loan obligations / net monthly income, as a percentage.
  // Prefer the user's stored net income (after-tax) when set, otherwise
  // fall back to the dashboard's actual recorded monthly income.
  const monthlyDebt = loans.reduce((s, l) => s + l.monthlyPayment, 0);
  const dsrIncome = incomeOverride ?? monthlyIncome;
  const dsr = dsrIncome > 0 ? (monthlyDebt / dsrIncome) * 100 : null;

  const heroCard = (
    <div
      className="panel"
      style={{
        padding: isMobile ? "18px 20px" : "20px 24px",
        width: isMobile ? "100%" : 320,
        background: "linear-gradient(150deg, color-mix(in oklab, var(--accent) 16%, var(--panel)), var(--panel))",
        flex: "0 0 auto",
      }}
    >
      <div style={{ color: "var(--t2)", fontSize: 13 }}>Net worth</div>
      <div
        style={{
          fontSize: isMobile ? 28 : 34,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          margin: "6px 0 14px",
          fontVariantNumeric: "tabular-nums",
          color: netWorth < 0 ? "var(--neg)" : "var(--t1)",
        }}
      >
        RM {fmt(netWorth)}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div>
          <div style={{ color: "var(--t3)", fontSize: 11.5 }}>Assets</div>
          <div
            style={{
              color: "var(--pos)",
              fontWeight: 600,
              marginTop: 3,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            RM {fmt0(totalAssets)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "var(--t3)", fontSize: 11.5 }}>Liabilities</div>
          <div
            style={{
              color: "var(--neg)",
              fontWeight: 600,
              marginTop: 3,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            RM {fmt0(totalLiabilities)}
          </div>
        </div>
      </div>
    </div>
  );

  const ministats = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
      <div style={{ display: "flex", gap: 14 }}>
        <MiniStat
          icon={<ArrowUpOutlined />}
          label="Income"
          value={`RM ${fmt0(monthlyIncome)}`}
          color="var(--pos)"
        />
        <MiniStat
          icon={<ArrowDownOutlined />}
          label="Expenses"
          value={`RM ${fmt0(monthlyExpense)}`}
          color="var(--neg)"
        />
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <MiniStat
          icon={<RiseOutlined />}
          label="Yearly gain"
          value={`${yearlyGain >= 0 ? "+" : "−"}RM ${fmt0(Math.abs(yearlyGain))}`}
          color={yearlyGain >= 0 ? "var(--pos)" : "var(--neg)"}
        />
        <MiniStat
          icon={<ScaleIcon />}
          label="Debt service ratio"
          value={dsr == null ? "—" : `${Math.round(dsr)}%`}
          onClick={() => setIncomeOpen(true)}
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className="titlebar">
        <h1 className="h1" style={{ fontSize: isMobile ? 22 : 26 }}>
          Dashboard
        </h1>
        <button className="btn-primary-emerald" onClick={openCreate}>
          <PlusOutlined />
          {isMobile ? "Add" : "Add Account"}
        </button>
      </div>

      {/* glance band */}
      <div
        style={{
          display: isMobile ? "flex" : "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 14,
          marginBottom: 16,
        }}
      >
        {heroCard}
        {ministats}
      </div>

      {/* Accounts / Allocation tab bar — same look as Categories: full-width on
          mobile, intrinsic-width on desktop. */}
      <div style={{ marginBottom: 16 }}>
        <div className="seg" style={isMobile ? { display: "flex" } : undefined}>
          {(["accounts", "allocation"] as const).map((t) => (
            <span
              key={t}
              className={tab === t ? "on" : ""}
              onClick={() => setTab(t)}
              style={{
                textTransform: "capitalize",
                ...(isMobile ? { flex: 1, textAlign: "center" } : {}),
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* tabbed list */}
      <div className="panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "accounts" ? (
          accounts.length === 0 ? (
            <div style={{ padding: 40 }}>
              <Empty description="No accounts yet — add your first account" />
            </div>
          ) : (
            <div>
              {groups.map((g) => {
                const neg = g.total < 0;
                return (
                  <div key={g.id}>
                    <div
                      className="grp-head"
                      style={{ borderTop: "1px solid var(--line-soft)" }}
                    >
                      <span className="d">{g.title}</span>
                      <span
                        className="t"
                        style={{
                          color: neg ? "var(--neg)" : "var(--t1)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {neg ? "−" : ""}RM {fmt(Math.abs(g.total))}
                      </span>
                    </div>
                    {g.accounts.map((a, i) => (
                      <AcctRow
                        key={a.id}
                        a={a}
                        onClick={() => openEdit(a)}
                        showBorder={i < g.accounts.length - 1}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )
        ) : allocation.length === 0 ? (
          <div style={{ padding: 40 }}>
            <Empty description="No asset accounts yet" />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "center",
              gap: isMobile ? 24 : 56,
              padding: isMobile ? "20px 18px" : "32px 32px",
            }}
          >
            <div
              style={{
                display: "grid",
                placeItems: "center",
                position: "relative",
                flexShrink: 0,
                alignSelf: isMobile ? "center" : "auto",
              }}
            >
              <Donut data={allocation} size={isMobile ? 160 : 190} thick={isMobile ? 20 : 24} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                }}
              >
                <div>
                  <div style={{ color: "var(--t3)", fontSize: 11 }}>Total assets</div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: isMobile ? 16 : 18,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    RM {fmt0(totalAssets)}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, width: "100%" }}>
              {allocation.map((d) => (
                <div className="bar-row" key={d.label} style={{ marginBottom: 18 }}>
                  <div className="bar-top" style={{ fontSize: 14 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 2,
                          background: d.color,
                        }}
                      />
                      <span style={{ color: "var(--t1)", fontWeight: 600 }}>{d.label}</span>
                    </span>
                    <span
                      style={{
                        color: "var(--t2)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      RM {fmt0(d.val)} · {d.pct}%
                    </span>
                  </div>
                  <div className="bar-track" style={{ height: 9 }}>
                    <div className="bar-fill" style={{ width: `${d.pct}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AccountModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
      />

      <IncomeModal
        open={incomeOpen}
        onClose={() => setIncomeOpen(false)}
        value={dsrIncome}
        onSave={async (n) => {
          try {
            await api.put(`/settings/${INCOME_SETTING_KEY}`, {
              value: String(n),
            });
            setIncomeOverride(n);
            setIncomeOpen(false);
            message.success("Saved");
          } catch (e: any) {
            message.error(e?.message ?? "Failed to save");
          }
        }}
      />
    </div>
  );
}
