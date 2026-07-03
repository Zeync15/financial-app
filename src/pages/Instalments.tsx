import { useEffect, useMemo, useState } from "react";
import { Popconfirm, Empty, Spin, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PlusOutlined,
  DeleteOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  PercentageOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useFabAction } from "@/hooks/useFabAction";
import IconCircle from "@/components/common/IconCircle";
import {
  Modal,
  FormBody,
  Row,
  Field,
  TextInput,
  AmountInput,
  DateInput,
  SelectInput,
  FormFooter,
  useFormState,
} from "@/components/forms/FormKit";

interface Instalment {
  id: string;
  name: string;
  principal: string;
  currency: string;
  interestRate: string;
  loanTermMonths: number;
  startDate: string;
  paymentDay: number | null;
  accountId: string | null;
  categoryId: string | null;
  monthlyPayment: number;
  totalInterest: number;
  remainingBalance: number;
  monthsPaid: number;
}

interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function fmt0(n: number) {
  return Math.round(n).toLocaleString();
}

function InstalmentCard({
  item,
  isMobile,
  onDelete,
}: {
  item: Instalment;
  isMobile: boolean;
  onDelete: (id: string) => void;
}) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState<AmortRow[] | null>(null);
  const pct = Math.round((item.monthsPaid / item.loanTermMonths) * 100);
  const rate = Number(item.interestRate);
  const principal = Number(item.principal);

  const handleToggleSchedule = async () => {
    if (!showSchedule && !schedule) {
      try {
        const data = await api.get<AmortRow[]>(`/instalments/${item.id}/schedule`);
        setSchedule(data);
      } catch (e: any) {
        message.error(e.message);
        return;
      }
    }
    setShowSchedule((s) => !s);
  };

  return (
    <div className="panel" style={{ padding: isMobile ? 16 : 20, marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <IconCircle icon={<FileTextOutlined />} color="#ff6b6b" size={isMobile ? 36 : 40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: isMobile ? 14.5 : 16,
              fontWeight: 600,
              color: "var(--t1)",
            }}
          >
            {item.name}
          </div>
          <div
            style={{
              fontSize: isMobile ? 11.5 : 12.5,
              color: "var(--t3)",
              marginTop: 2,
            }}
          >
            {rate.toFixed(2)}% p.a. · started {item.startDate}
            {item.paymentDay ? ` · pays day ${item.paymentDay}` : ""}
          </div>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={handleToggleSchedule}>
              <CalendarOutlined />
              {showSchedule ? "Hide" : "Schedule"}
            </button>
            <Popconfirm title="Delete?" onConfirm={() => onDelete(item.id)}>
              <button className="icon-btn sm danger" title="Delete">
                <DeleteOutlined />
              </button>
            </Popconfirm>
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)",
          gap: isMobile ? 12 : 16,
          marginBottom: 18,
        }}
      >
        <div>
          <div className="stat-label">Principal</div>
          <div className="stat-val">RM {fmt(principal)}</div>
        </div>
        <div>
          <div className="stat-label">Monthly payment</div>
          <div className="stat-val">RM {fmt(item.monthlyPayment)}</div>
        </div>
        <div>
          <div className="stat-label">Interest rate</div>
          <div className="stat-val">
            {rate.toFixed(2)}
            <span style={{ fontSize: 12, color: "var(--t3)", fontWeight: 400 }}>% p.a.</span>
          </div>
        </div>
        <div>
          <div className="stat-label">Total interest</div>
          <div className="stat-val" style={{ color: "var(--neg)" }}>
            RM {fmt(item.totalInterest)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12.5,
          marginBottom: 7,
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        <span style={{ color: "var(--t2)" }}>
          {item.monthsPaid}/{item.loanTermMonths} months paid <span style={{ color: "var(--t4)" }}>· {pct}%</span>
        </span>
        <span style={{ color: "var(--t2)" }}>
          Remaining{" "}
          <span
            style={{
              color: "var(--t1)",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            RM {fmt(item.remainingBalance)}
          </span>
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>

      {isMobile && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={handleToggleSchedule}>
            <CalendarOutlined />
            {showSchedule ? "Hide schedule" : "View schedule"}
          </button>
          <Popconfirm title="Delete?" onConfirm={() => onDelete(item.id)}>
            <button className="icon-btn danger" title="Delete">
              <DeleteOutlined />
            </button>
          </Popconfirm>
        </div>
      )}

      {showSchedule && schedule && (
        <div
          style={{
            marginTop: 18,
            border: "1px solid var(--line)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--t2)",
              background: "rgba(255,255,255,0.02)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            Amortization schedule
          </div>
          <div className="noscroll" style={{ maxHeight: 260, overflowY: "auto" }}>
            <table className="lg-table">
              <thead>
                <tr>
                  <th style={{ width: 46 }}>#</th>
                  <th className="num">Payment</th>
                  <th className="num">Principal</th>
                  <th className="num">Interest</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {schedule.slice(0, 12).map((row) => (
                  <tr key={row.month}>
                    <td style={{ color: "var(--t3)" }}>{row.month}</td>
                    <td className="num">{fmt(row.payment)}</td>
                    <td className="num" style={{ color: "var(--pos)" }}>
                      {fmt(row.principal)}
                    </td>
                    <td className="num" style={{ color: "var(--neg)" }}>
                      {fmt(row.interest)}
                    </td>
                    <td className="num" style={{ color: "var(--t2)" }}>
                      {fmt(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            style={{
              padding: "8px 14px",
              fontSize: 11.5,
              color: "var(--t3)",
              textAlign: "center",
              borderTop: "1px solid var(--line)",
            }}
          >
            Showing first 12 of {item.loanTermMonths} payments
          </div>
        </div>
      )}
    </div>
  );
}

interface InstalmentFormState {
  name: string;
  principal: string;
  interestRate: string;
  loanTermMonths: string;
  startDate: string;
  paymentDay: string;
  accountId: string;
  categoryId: string;
}

interface AccountLite {
  id: string;
  name: string;
}
interface CategoryLite {
  id: string;
  name: string;
  type: string;
}

function AddInstalmentModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: InstalmentFormState) => Promise<void>;
}) {
  const { state, set } = useFormState<InstalmentFormState>(open, {
    name: "",
    principal: "",
    interestRate: "",
    loanTermMonths: "",
    startDate: "",
    paymentDay: "",
    accountId: "",
    categoryId: "",
  });
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      api.get<AccountLite[]>("/accounts"),
      api.get<CategoryLite[]>("/categories"),
    ]).then(([a, c]) => {
      setAccounts(a);
      setCategories(c.filter((x) => x.type === "expense"));
    });
  }, [open]);

  const submit = async () => {
    if (!state.name || !state.principal || !state.interestRate || !state.loanTermMonths || !state.startDate) {
      message.error("All fields are required");
      return;
    }
    if (!state.accountId) {
      message.error("Select the account this instalment is paid from");
      return;
    }
    const day = Number(state.paymentDay);
    if (!state.paymentDay || day < 1 || day > 31) {
      message.error("Enter a payment day between 1 and 31");
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
    <Modal open={open} onClose={onClose} title="New Instalment" icon="plus">
      <FormBody>
        <Field label="Instalment Name" required>
          <TextInput value={state.name} onChange={(v) => set("name", v)} placeholder="e.g. iPhone 17" autoFocus />
        </Field>
        <Row>
          <Field label="Principal Amount" required>
            <AmountInput value={state.principal} onChange={(v) => set("principal", v)} />
          </Field>
          <Field label="Interest Rate" required hint="Annual % rate (p.a.)">
            <TextInput
              value={state.interestRate}
              onChange={(v) => set("interestRate", v)}
              placeholder="0.00"
              maxDecimals={4}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Term" required hint="Number of months">
            <TextInput
              value={state.loanTermMonths}
              onChange={(v) => set("loanTermMonths", v)}
              placeholder="e.g. 12"
              maxDecimals={0}
            />
          </Field>
          <Field label="Start Date" required>
            <DateInput value={state.startDate} onChange={(v) => set("startDate", v)} />
          </Field>
        </Row>
        <Row>
          <Field label="Pay From Account" required hint="Balance deducted monthly">
            <SelectInput
              value={state.accountId}
              onChange={(v) => set("accountId", v)}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              placeholder="Select account"
            />
          </Field>
          <Field label="Payment Day" required hint="Day of month (1–31)">
            <TextInput
              value={state.paymentDay}
              onChange={(v) => set("paymentDay", v)}
              placeholder="e.g. 5"
              maxDecimals={0}
            />
          </Field>
        </Row>
        <Field label="Category" hint="Optional — used on each posted payment">
          <SelectInput
            value={state.categoryId}
            onChange={(v) => set("categoryId", v)}
            options={[{ value: "", label: "—" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </Field>
      </FormBody>
      <FormFooter primary="Add Instalment" onPrimary={submit} onCancel={onClose} loading={saving} />
    </Modal>
  );
}

export default function Instalments() {
  const [items, setItems] = useState<Instalment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  // `/instalments/new` routes here too — open the form and navigate back to
  // `/instalments` on close.
  const wantsNew = location.pathname.endsWith("/instalments/new");

  useEffect(() => {
    if (wantsNew) setModalOpen(true);
    else setModalOpen(false);
  }, [wantsNew]);

  const closeForm = () => {
    setModalOpen(false);
    if (wantsNew) navigate("/instalments", { replace: true });
  };

  // FAB opens the add form: full-screen route on mobile, modal on desktop.
  useFabAction(() => (isMobile ? navigate("/instalments/new") : setModalOpen(true)));

  const load = () => {
    setLoading(true);
    api
      .get<Instalment[]>("/instalments")
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (v: InstalmentFormState) => {
    try {
      await api.post("/instalments", {
        name: v.name,
        currency: "MYR",
        principal: v.principal,
        interestRate: v.interestRate,
        loanTermMonths: Number(v.loanTermMonths),
        startDate: v.startDate,
        paymentDay: Number(v.paymentDay),
        accountId: v.accountId,
        categoryId: v.categoryId || null,
      });
      // A due-today payment should post immediately; refresh listeners too.
      await api.post("/recurring-transactions/run", {});
      window.dispatchEvent(new Event("transaction-added"));
      message.success("Instalment added");
      closeForm();
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/instalments/${id}`);
      message.success("Instalment deleted");
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const totals = useMemo(() => {
    const totalDebt = items.reduce((s, l) => s + l.remainingBalance, 0);
    const totalMonthly = items.reduce((s, l) => s + l.monthlyPayment, 0);
    const totalPrincipal = items.reduce((s, l) => s + Number(l.principal), 0);
    const totalInterest = items.reduce((s, l) => s + l.totalInterest, 0);
    const paidOff = totalPrincipal > 0 ? Math.round(((totalPrincipal - totalDebt) / totalPrincipal) * 100) : 0;
    return {
      totalDebt,
      totalMonthly,
      totalPrincipal,
      totalInterest,
      paidOff,
    };
  }, [items]);

  if (loading) {
    return <Spin size="large" className="flex justify-center mt-20" />;
  }

  const summaryRail = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="panel" style={{ padding: "18px 20px" }}>
        <div className="stat-label">Total outstanding debt</div>
        <div
          style={{
            fontSize: isMobile ? 27 : 30,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "var(--neg)",
            fontVariantNumeric: "tabular-nums",
            margin: "3px 0 13px",
          }}
        >
          RM {fmt(totals.totalDebt)}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12.5,
            color: "var(--t3)",
            marginBottom: 7,
          }}
        >
          <span>{totals.paidOff}% paid off</span>
          <span>Borrowed RM {fmt0(totals.totalPrincipal)}</span>
        </div>
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${totals.paidOff}%` }} />
        </div>
      </div>
      <div className="panel" style={{ padding: "18px 20px" }}>
        {[
          {
            label: "Monthly obligations",
            val: `RM ${fmt(totals.totalMonthly)}`,
            icon: <CalendarOutlined />,
            color: "var(--t2)",
          },
          {
            label: "Active instalments",
            val: String(items.length),
            icon: <UnorderedListOutlined />,
            color: "var(--t2)",
          },
          {
            label: "Total interest (life)",
            val: `RM ${fmt0(totals.totalInterest)}`,
            icon: <PercentageOutlined />,
            color: "var(--neg)",
          },
        ].map((r, i, arr) => (
          <div
            key={r.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: i < arr.length - 1 ? 13 : 0,
              marginBottom: i < arr.length - 1 ? 13 : 0,
              borderBottom: i < arr.length - 1 ? "1px solid var(--line-soft)" : "none",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "var(--t2)",
                fontSize: 13.5,
              }}
            >
              <span style={{ color: r.color }}>{r.icon}</span>
              {r.label}
            </span>
            <span
              style={{
                color: "var(--t1)",
                fontWeight: 600,
                fontSize: 14.5,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {r.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="titlebar">
        <h1 className="h1" style={{ fontSize: isMobile ? 22 : 26 }}>
          Instalments
        </h1>
        {!isMobile && (
          <button className="btn-primary-emerald" onClick={() => setModalOpen(true)}>
            <PlusOutlined />
            Add Instalment
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="panel" style={{ padding: 40 }}>
          <Empty description="No instalments yet" />
        </div>
      ) : (
        <div
          style={
            isMobile
              ? { display: "flex", flexDirection: "column", gap: 14 }
              : {
                  display: "grid",
                  gridTemplateColumns: "320px 1fr",
                  gap: 16,
                  alignItems: "start",
                }
          }
        >
          {summaryRail}
          <div>
            {items.map((l) => (
              <InstalmentCard key={l.id} item={l} isMobile={isMobile} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      <AddInstalmentModal open={modalOpen} onClose={closeForm} onSubmit={handleCreate} />
    </div>
  );
}
