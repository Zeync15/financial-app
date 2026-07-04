import { useEffect, useMemo, useState } from "react";
import { Empty, Spin, message, Tag, Switch } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PlusOutlined,
  EditOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useFabAction } from "@/hooks/useFabAction";
import IconCircle from "@/components/common/IconCircle";
import { getCategoryIcon, DEFAULT_CATEGORY_COLOR } from "@/lib/categoryIcons";
import {
  Modal,
  FormBody,
  Row,
  Field,
  TextInput,
  AmountInput,
  DateInput,
  SelectInput,
  Segmented,
  FormFooter,
  useFormState,
} from "@/components/forms/FormKit";

type RecurType = "income" | "expense";

interface Recurring {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: RecurType;
  amount: string;
  description: string | null;
  notes: string | null;
  dayOfMonth: number;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  isActive: boolean;
  source: "manual" | "instalment";
  instalmentId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  accountName: string | null;
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

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

// ── Add / edit form ──────────────────────────────────────────────────────────
interface RecurFormState {
  type: RecurType;
  accountId: string;
  categoryId: string;
  amount: string;
  description: string;
  dayOfMonth: string;
  startDate: string;
  endDate: string;
  notes: string;
}

function RecurringForm({
  open,
  onClose,
  onSaved,
  onDelete,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => void;
  editing: Recurring | null;
}) {
  const isEditing = !!editing;
  const initial: RecurFormState = useMemo(
    () => ({
      type: editing?.type ?? "expense",
      accountId: editing?.accountId ?? "",
      categoryId: editing?.categoryId ?? "",
      amount: editing ? String(Number(editing.amount)) : "",
      description: editing?.description ?? "",
      dayOfMonth: editing ? String(editing.dayOfMonth) : "",
      startDate: editing?.startDate ?? "",
      endDate: editing?.endDate ?? "",
      notes: editing?.notes ?? "",
    }),
    [editing],
  );
  const { state, set, setState } = useFormState<RecurFormState>(open, initial);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setState(initial);
    Promise.all([
      api.get<AccountLite[]>("/accounts"),
      api.get<CategoryLite[]>("/categories"),
    ]).then(([a, c]) => {
      setAccounts(a);
      setCategories(c);
    });
  }, [open, initial, setState]);

  const filteredCategories = categories.filter((c) => c.type === state.type);

  const submit = async () => {
    if (!state.accountId || !state.amount || !state.startDate) {
      message.error("Account, amount, and start date are required");
      return;
    }
    const day = Number(state.dayOfMonth);
    if (!state.dayOfMonth || day < 1 || day > 31) {
      message.error("Enter a payment day between 1 and 31");
      return;
    }
    if (state.endDate && state.endDate < state.startDate) {
      message.error("End date can't be before the start date");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: state.type,
        accountId: state.accountId,
        categoryId: state.categoryId || null,
        amount: state.amount,
        description: state.description || null,
        dayOfMonth: day,
        startDate: state.startDate,
        endDate: state.endDate || null,
        notes: state.notes || null,
      };
      if (isEditing && editing) {
        await api.put(`/recurring-transactions/${editing.id}`, payload);
        message.success("Recurring updated");
      } else {
        await api.post("/recurring-transactions", payload);
        // Post a due-today occurrence right away.
        await api.post("/recurring-transactions/run", {});
        message.success("Recurring added");
      }
      window.dispatchEvent(new Event("transaction-added"));
      onClose();
      onSaved();
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Recurring" : "New Recurring"}
      icon={isEditing ? "pencil" : "plus"}
    >
      <FormBody>
        <Field label="Type" required>
          <Segmented<RecurType>
            value={state.type}
            onChange={(t) => {
              set("type", t);
              set("categoryId", "");
            }}
            options={[
              { value: "income", label: "Income" },
              { value: "expense", label: "Expense" },
            ]}
          />
        </Field>
        <Row>
          <Field label="Account" required>
            <SelectInput
              value={state.accountId}
              onChange={(v) => set("accountId", v)}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              placeholder="Select account"
            />
          </Field>
          <Field label="Amount" required>
            <AmountInput value={state.amount} onChange={(v) => set("amount", v)} />
          </Field>
        </Row>
        <Field label="Description">
          <TextInput
            value={state.description}
            onChange={(v) => set("description", v)}
            placeholder="e.g. Rent, Netflix, Salary"
          />
        </Field>
        <Row>
          <Field label="Category">
            <SelectInput
              value={state.categoryId}
              onChange={(v) => set("categoryId", v)}
              options={[
                { value: "", label: "—" },
                ...filteredCategories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </Field>
          <Field label="Payment Day" required hint="Day of month (1–31)">
            <TextInput
              value={state.dayOfMonth}
              onChange={(v) => set("dayOfMonth", v)}
              placeholder="e.g. 1"
              maxDecimals={0}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Start Date" required>
            <DateInput value={state.startDate} onChange={(v) => set("startDate", v)} />
          </Field>
          <Field label="End Date" hint="Leave blank = forever">
            <DateInput value={state.endDate} onChange={(v) => set("endDate", v)} />
          </Field>
        </Row>
      </FormBody>
      <FormFooter
        primary={isEditing ? "Save Changes" : "Add Recurring"}
        onPrimary={submit}
        onCancel={onClose}
        loading={saving}
        danger={isEditing ? "Delete" : undefined}
        onDanger={isEditing ? onDelete : undefined}
      />
    </Modal>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
function RecurringCard({
  item,
  isMobile,
  onEdit,
  onToggle,
}: {
  item: Recurring;
  isMobile: boolean;
  onEdit: (r: Recurring) => void;
  onToggle: (r: Recurring, active: boolean) => void;
}) {
  const isInstalment = item.source === "instalment";
  const amount = Number(item.amount);
  const sign = item.type === "income" ? "+" : "−";
  const color = item.type === "income" ? "var(--pos)" : "var(--neg)";
  const iconColor = item.categoryColor || DEFAULT_CATEGORY_COLOR;
  const icon = getCategoryIcon(item.categoryName);
  const navigate = useNavigate();

  return (
    <div
      className="panel"
      style={{ padding: isMobile ? 16 : 20, marginBottom: 14, opacity: item.isActive ? 1 : 0.6 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <IconCircle icon={icon} color={iconColor} size={isMobile ? 36 : 40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: isMobile ? 14.5 : 16,
              fontWeight: 600,
              color: "var(--t1)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {item.description || (isInstalment ? "Instalment payment" : "Recurring")}
            {isInstalment && <Tag color="orange" style={{ marginInlineEnd: 0 }}>Instalment</Tag>}
            {!item.isActive && <Tag style={{ marginInlineEnd: 0 }}>Paused</Tag>}
          </div>
          <div style={{ fontSize: isMobile ? 11.5 : 12.5, color: "var(--t3)", marginTop: 2 }}>
            {item.accountName ?? "—"}
            {item.categoryName ? ` · ${item.categoryName}` : ""} · {ordinal(item.dayOfMonth)} monthly
          </div>
        </div>
        <div
          style={{
            fontSize: isMobile ? 15 : 17,
            fontWeight: 700,
            color,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {sign} RM {fmt(amount)}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12.5,
          color: "var(--t2)",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span>
          <SyncOutlined style={{ marginRight: 6, color: "var(--t3)" }} />
          {item.isActive ? `Next ${item.nextRunDate}` : "Paused"}
          {item.endDate ? ` · ends ${item.endDate}` : " · no end date"}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isInstalment ? (
            <button className="btn-ghost" onClick={() => navigate("/instalments")}>
              Manage in Instalments
            </button>
          ) : (
            <>
              <Switch
                size="small"
                checked={item.isActive}
                onChange={(v) => onToggle(item, v)}
                title={item.isActive ? "Pause" : "Resume"}
              />
              <button className="icon-btn sm" title="Edit" onClick={() => onEdit(item)}>
                <EditOutlined />
              </button>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function RecurringTransactions() {
  const [items, setItems] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const wantsNew = location.pathname.endsWith("/recurring/new");

  const load = () => {
    setLoading(true);
    api
      .get<Recurring[]>("/recurring-transactions")
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const onAdded = () => load();
    window.addEventListener("transaction-added", onAdded);
    return () => window.removeEventListener("transaction-added", onAdded);
  }, []);

  useEffect(() => {
    if (wantsNew) {
      setEditing(null);
      setModalOpen(true);
    } else {
      setModalOpen(false);
    }
  }, [wantsNew]);

  const closeForm = () => {
    setModalOpen(false);
    setEditing(null);
    if (wantsNew) navigate("/recurring", { replace: true });
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (r: Recurring) => {
    setEditing(r);
    setModalOpen(true);
  };

  useFabAction(() => (isMobile ? navigate("/recurring/new") : openAdd()));

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/recurring-transactions/${id}`);
      message.success("Recurring deleted");
      closeForm();
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleToggle = async (r: Recurring, active: boolean) => {
    try {
      await api.put(`/recurring-transactions/${r.id}`, { isActive: active });
      if (active) await api.post("/recurring-transactions/run", {});
      window.dispatchEvent(new Event("transaction-added"));
    } catch (e: any) {
      message.error(e.message);
      load();
    }
  };

  const totals = useMemo(() => {
    const active = items.filter((i) => i.isActive);
    const income = active.filter((i) => i.type === "income").reduce((s, i) => s + Number(i.amount), 0);
    const expense = active.filter((i) => i.type === "expense").reduce((s, i) => s + Number(i.amount), 0);
    return { income, expense, net: income - expense, count: active.length };
  }, [items]);

  if (loading) {
    return <Spin size="large" className="flex justify-center mt-20" />;
  }

  const summaryRail = (
    <div className="panel" style={{ padding: "18px 20px" }}>
      <div className="stat-label">Monthly net</div>
      <div
        style={{
          fontSize: isMobile ? 27 : 30,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: totals.net >= 0 ? "var(--pos)" : "var(--neg)",
          fontVariantNumeric: "tabular-nums",
          margin: "3px 0 13px",
        }}
      >
        {totals.net >= 0 ? "+" : "−"} RM {fmt(Math.abs(totals.net))}
      </div>
      {[
        { label: "Monthly income", val: `RM ${fmt(totals.income)}`, color: "var(--pos)" },
        { label: "Monthly expense", val: `RM ${fmt(totals.expense)}`, color: "var(--neg)" },
        { label: "Active rules", val: String(totals.count), color: "var(--t2)" },
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
          <span style={{ color: "var(--t2)", fontSize: 13.5 }}>{r.label}</span>
          <span
            style={{ color: r.color, fontWeight: 600, fontSize: 14.5, fontVariantNumeric: "tabular-nums" }}
          >
            {r.val}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="titlebar">
        <h1 className="h1" style={{ fontSize: isMobile ? 22 : 26 }}>
          Recurring
        </h1>
        {!isMobile && (
          <button className="btn-primary-emerald" onClick={openAdd}>
            <PlusOutlined />
            Add Recurring
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="panel" style={{ padding: 40 }}>
          <Empty description="No recurring transactions yet" />
        </div>
      ) : (
        <div
          style={
            isMobile
              ? { display: "flex", flexDirection: "column", gap: 14 }
              : { display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }
          }
        >
          {summaryRail}
          <div>
            {items.map((r) => (
              <RecurringCard
                key={r.id}
                item={r}
                isMobile={isMobile}
                onEdit={openEdit}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      )}

      <RecurringForm
        open={modalOpen}
        onClose={closeForm}
        onSaved={load}
        onDelete={editing ? () => handleDelete(editing.id) : undefined}
        editing={editing}
      />
    </div>
  );
}
