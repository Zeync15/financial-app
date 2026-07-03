import { useEffect, useMemo, useState } from "react";
import { Popconfirm, Empty, Spin, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ControlOutlined,
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

interface Loan {
  id: string;
  name: string;
  principal: string;
  currency: string;
  interestRate: string;
  loanTermMonths: number;
  startDate: string;
  paymentType: string;
  monthlyPayment: number;
  totalInterest: number;
  remainingBalance: number;
  monthsPaid: number;
  payoffMonths: number;
}

interface AmortRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

interface LoanEventRow {
  id: string;
  effectiveDate: string;
  type: "extra_payment" | "payment_change" | "rate_change";
  amount: string;
  note: string | null;
}

const EVENT_LABEL: Record<LoanEventRow["type"], string> = {
  extra_payment: "Extra payment",
  payment_change: "New installment",
  rate_change: "Rate change",
};

const PAYMENT_LABEL: Record<string, string> = {
  fixed: "Fixed rate",
  reducing_balance: "Reducing balance",
};

const PAYMENT_OPTS = [
  { value: "fixed", label: "Fixed Rate (Flat Rate / Hire Purchase)" },
  { value: "reducing_balance", label: "Reducing Balance (Amortization)" },
];

function fmt(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function fmt0(n: number) {
  return Math.round(n).toLocaleString();
}

function LoanCard({
  loan,
  isMobile,
  onEdit,
  onManageEvents,
  onDelete,
  scheduleNonce,
}: {
  loan: Loan;
  isMobile: boolean;
  onEdit: (loan: Loan) => void;
  onManageEvents: (loan: Loan) => void;
  onDelete: (id: string) => void;
  scheduleNonce: number;
}) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState<AmortRow[] | null>(null);
  const isReducing = loan.paymentType === "reducing_balance";
  const payoff = loan.payoffMonths || loan.loanTermMonths;
  const pct = Math.min(100, Math.round((loan.monthsPaid / payoff) * 100));
  const earlyPayoff = payoff < loan.loanTermMonths;
  const rate = Number(loan.interestRate);
  const principal = Number(loan.principal);

  // Adjustments can change the schedule while it's open — refetch on nonce bump.
  useEffect(() => {
    if (showSchedule && schedule) {
      api.get<AmortRow[]>(`/loans/${loan.id}/schedule`).then(setSchedule).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleNonce]);

  const handleToggleSchedule = async () => {
    if (!showSchedule && !schedule) {
      try {
        const data = await api.get<AmortRow[]>(`/loans/${loan.id}/schedule`);
        setSchedule(data);
      } catch (e: any) {
        message.error(e.message);
        return;
      }
    }
    setShowSchedule((s) => !s);
  };

  return (
    <div
      className="panel"
      style={{ padding: isMobile ? 16 : 20, marginBottom: 14 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <IconCircle
          icon={<FileTextOutlined />}
          color="#ff6b6b"
          size={isMobile ? 36 : 40}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: isMobile ? 14.5 : 16,
              fontWeight: 600,
              color: "var(--t1)",
            }}
          >
            {loan.name}
          </div>
          <div
            style={{
              fontSize: isMobile ? 11.5 : 12.5,
              color: "var(--t3)",
              marginTop: 2,
            }}
          >
            {PAYMENT_LABEL[loan.paymentType] ?? loan.paymentType} ·{" "}
            {rate.toFixed(2)}% p.a. · started {loan.startDate}
          </div>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={handleToggleSchedule}>
              <CalendarOutlined />
              {showSchedule ? "Hide" : "Schedule"}
            </button>
            {isReducing && (
              <button className="icon-btn sm" title="Adjustments" onClick={() => onManageEvents(loan)}>
                <ControlOutlined />
              </button>
            )}
            <button className="icon-btn sm" title="Edit" onClick={() => onEdit(loan)}>
              <EditOutlined />
            </button>
            <Popconfirm title="Delete?" onConfirm={() => onDelete(loan.id)}>
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
          <div className="stat-val">RM {fmt(loan.monthlyPayment)}</div>
        </div>
        <div>
          <div className="stat-label">Interest rate</div>
          <div className="stat-val">
            {rate.toFixed(2)}
            <span
              style={{ fontSize: 12, color: "var(--t3)", fontWeight: 400 }}
            >
              % p.a.
            </span>
          </div>
        </div>
        <div>
          <div className="stat-label">Total interest</div>
          <div className="stat-val" style={{ color: "var(--neg)" }}>
            RM {fmt(loan.totalInterest)}
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
          {Math.min(loan.monthsPaid, payoff)}/{payoff} months paid{" "}
          <span style={{ color: "var(--t4)" }}>· {pct}%</span>
          {earlyPayoff && (
            <span style={{ color: "var(--pos)" }}>
              {" "}· paid off {loan.loanTermMonths - payoff} mo early
            </span>
          )}
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
            RM {fmt(loan.remainingBalance)}
          </span>
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>

      {isMobile && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            className="btn-ghost"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={handleToggleSchedule}
          >
            <CalendarOutlined />
            {showSchedule ? "Hide" : "Schedule"}
          </button>
          {isReducing && (
            <button className="icon-btn" title="Adjustments" onClick={() => onManageEvents(loan)}>
              <ControlOutlined />
            </button>
          )}
          <button className="icon-btn" title="Edit" onClick={() => onEdit(loan)}>
            <EditOutlined />
          </button>
          <Popconfirm title="Delete?" onConfirm={() => onDelete(loan.id)}>
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
            Showing first 12 of {schedule.length} payments
          </div>
        </div>
      )}
    </div>
  );
}

interface LoanFormState {
  name: string;
  principal: string;
  interestRate: string;
  loanTermMonths: string;
  startDate: string;
  paymentType: string;
}

function AddLoanModal({
  open,
  onClose,
  onSubmit,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: LoanFormState) => Promise<void>;
  editing?: Loan | null;
}) {
  const { state, set } = useFormState<LoanFormState>(open, {
    name: editing?.name ?? "",
    principal: editing ? String(Number(editing.principal)) : "",
    interestRate: editing ? String(Number(editing.interestRate)) : "",
    loanTermMonths: editing ? String(editing.loanTermMonths) : "",
    startDate: editing?.startDate ?? "",
    paymentType: editing?.paymentType ?? "fixed",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (
      !state.name ||
      !state.principal ||
      !state.interestRate ||
      !state.loanTermMonths ||
      !state.startDate
    ) {
      message.error("All fields are required");
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
      title={editing ? "Edit Loan" : "New Loan"}
      icon={editing ? "pencil" : "plus"}
    >
      <FormBody>
        <Field label="Loan Name" required>
          <TextInput
            value={state.name}
            onChange={(v) => set("name", v)}
            placeholder="e.g. Home Loan"
            autoFocus
          />
        </Field>
        <Row>
          <Field label="Principal Amount" required>
            <AmountInput
              value={state.principal}
              onChange={(v) => set("principal", v)}
            />
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
              placeholder="e.g. 36"
              maxDecimals={0}
            />
          </Field>
          <Field label="Start Date" required>
            <DateInput
              value={state.startDate}
              onChange={(v) => set("startDate", v)}
            />
          </Field>
        </Row>
        <Field label="Payment Type" required>
          <SelectInput
            value={state.paymentType}
            onChange={(v) => set("paymentType", v)}
            options={PAYMENT_OPTS}
          />
        </Field>
      </FormBody>
      <FormFooter
        primary={editing ? "Save Changes" : "Add Loan"}
        onPrimary={submit}
        onCancel={onClose}
        loading={saving}
      />
    </Modal>
  );
}

function LoanEventsModal({
  open,
  onClose,
  loan,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  loan: Loan | null;
  onChanged: () => void;
}) {
  const [events, setEvents] = useState<LoanEventRow[]>([]);
  const [type, setType] = useState<LoanEventRow["type"]>("extra_payment");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadEvents = () => {
    if (!loan) return;
    api.get<LoanEventRow[]>(`/loans/${loan.id}/events`).then(setEvents).catch(() => {});
  };
  useEffect(() => {
    if (open && loan) {
      setType("extra_payment");
      setEffectiveDate("");
      setAmount("");
      setNote("");
      loadEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loan?.id]);

  const isRate = type === "rate_change";
  const amountLabel =
    type === "extra_payment"
      ? "Extra Amount"
      : type === "payment_change"
        ? "New Installment"
        : "New Rate";

  const add = async () => {
    if (!loan) return;
    if (!effectiveDate || !amount) {
      message.error("Effective date and amount are required");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/loans/${loan.id}/events`, {
        effectiveDate,
        type,
        amount,
        note: note || null,
      });
      setEffectiveDate("");
      setAmount("");
      setNote("");
      loadEvents();
      onChanged();
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!loan) return;
    try {
      await api.delete(`/loans/${loan.id}/events/${id}`);
      loadEvents();
      onChanged();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Adjustments · ${loan?.name ?? ""}`} icon="pencil">
      <FormBody>
        <Field label="Type" required>
          <SelectInput
            value={type}
            onChange={(v) => setType(v as LoanEventRow["type"])}
            options={[
              { value: "extra_payment", label: "Extra payment (one-off)" },
              { value: "payment_change", label: "New installment (permanent)" },
              { value: "rate_change", label: "Interest rate change" },
            ]}
          />
        </Field>
        <Row>
          <Field label="Effective Date" required>
            <DateInput value={effectiveDate} onChange={setEffectiveDate} />
          </Field>
          <Field label={amountLabel} required hint={isRate ? "Annual % rate (p.a.)" : undefined}>
            {isRate ? (
              <TextInput value={amount} onChange={setAmount} placeholder="0.00" maxDecimals={4} />
            ) : (
              <AmountInput value={amount} onChange={setAmount} />
            )}
          </Field>
        </Row>
        <Field label="Note (optional)">
          <TextInput
            value={note}
            onChange={setNote}
            placeholder="e.g. OPR hike, bonus prepayment"
          />
        </Field>
        {events.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div className="stat-label" style={{ marginBottom: 6 }}>
              Timeline
            </div>
            {events.map((ev) => (
              <div
                key={ev.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderTop: "1px solid var(--line-soft)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "var(--t1)", fontSize: 13, fontWeight: 600 }}>
                    {EVENT_LABEL[ev.type]}{" "}
                    <span style={{ color: "var(--t3)", fontWeight: 400 }}>
                      ·{" "}
                      {ev.type === "rate_change"
                        ? `${Number(ev.amount).toFixed(2)}% p.a.`
                        : `RM ${fmt(Number(ev.amount))}`}
                    </span>
                  </div>
                  <div style={{ color: "var(--t3)", fontSize: 11.5 }}>
                    {ev.effectiveDate}
                    {ev.note ? ` · ${ev.note}` : ""}
                  </div>
                </div>
                <Popconfirm title="Remove?" onConfirm={() => del(ev.id)}>
                  <button className="icon-btn sm danger" title="Remove">
                    <DeleteOutlined />
                  </button>
                </Popconfirm>
              </div>
            ))}
          </div>
        )}
      </FormBody>
      <FormFooter primary="Add Adjustment" onPrimary={add} onCancel={onClose} loading={saving} />
    </Modal>
  );
}

export default function Loans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [eventsLoan, setEventsLoan] = useState<Loan | null>(null);
  const [scheduleNonce, setScheduleNonce] = useState(0);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  // `/loans/new` routes here too — open the form drawer/modal and navigate
  // back to `/loans` on close.
  const wantsNew = location.pathname.endsWith("/loans/new");

  useEffect(() => {
    if (wantsNew) {
      setEditingLoan(null);
      setModalOpen(true);
    } else {
      setModalOpen(false);
    }
  }, [wantsNew]);

  const closeForm = () => {
    setModalOpen(false);
    setEditingLoan(null);
    if (wantsNew) navigate("/loans", { replace: true });
  };

  const openAdd = () => {
    setEditingLoan(null);
    setModalOpen(true);
  };
  const openEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setModalOpen(true);
  };

  // FAB opens the add-loan form: full-screen route on mobile, modal on desktop.
  useFabAction(() => (isMobile ? navigate("/loans/new") : openAdd()));

  const load = () => {
    setLoading(true);
    api
      .get<Loan[]>("/loans")
      .then(setLoans)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmitLoan = async (v: LoanFormState) => {
    const payload = {
      name: v.name,
      currency: "MYR",
      principal: v.principal,
      interestRate: v.interestRate,
      loanTermMonths: Number(v.loanTermMonths),
      startDate: v.startDate,
      paymentType: v.paymentType,
    };
    try {
      if (editingLoan) {
        await api.put(`/loans/${editingLoan.id}`, payload);
        message.success("Loan updated");
      } else {
        await api.post("/loans", payload);
        message.success("Loan added");
      }
      closeForm();
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const onEventsChanged = () => {
    load();
    setScheduleNonce((n) => n + 1);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/loans/${id}`);
      message.success("Loan deleted");
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const totals = useMemo(() => {
    const totalDebt = loans.reduce((s, l) => s + l.remainingBalance, 0);
    const totalMonthly = loans.reduce((s, l) => s + l.monthlyPayment, 0);
    const totalPrincipal = loans.reduce(
      (s, l) => s + Number(l.principal),
      0,
    );
    const totalInterest = loans.reduce((s, l) => s + l.totalInterest, 0);
    const paidOff =
      totalPrincipal > 0
        ? Math.round(((totalPrincipal - totalDebt) / totalPrincipal) * 100)
        : 0;
    return {
      totalDebt,
      totalMonthly,
      totalPrincipal,
      totalInterest,
      paidOff,
    };
  }, [loans]);

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
            label: "Active loans",
            val: String(loans.length),
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
              borderBottom:
                i < arr.length - 1 ? "1px solid var(--line-soft)" : "none",
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
          Loans
        </h1>
        {!isMobile && (
          <button className="btn-primary-emerald" onClick={openAdd}>
            <PlusOutlined />
            Add Loan
          </button>
        )}
      </div>

      {loans.length === 0 ? (
        <div className="panel" style={{ padding: 40 }}>
          <Empty description="No loans yet" />
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
            {loans.map((l) => (
              <LoanCard
                key={l.id}
                loan={l}
                isMobile={isMobile}
                onEdit={openEdit}
                onManageEvents={setEventsLoan}
                onDelete={handleDelete}
                scheduleNonce={scheduleNonce}
              />
            ))}
          </div>
        </div>
      )}

      <AddLoanModal
        open={modalOpen}
        onClose={closeForm}
        onSubmit={handleSubmitLoan}
        editing={editingLoan}
      />
      <LoanEventsModal
        open={!!eventsLoan}
        onClose={() => setEventsLoan(null)}
        loan={eventsLoan}
        onChanged={onEventsChanged}
      />
    </div>
  );
}
