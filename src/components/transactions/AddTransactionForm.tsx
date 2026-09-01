import { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import {
  Modal,
  FormBody,
  Row,
  Field,
  TextInput,
  AmountInput,
  AmountKeypad,
  evaluateAmount,
  formatAmountResult,
  DateInput,
  SelectInput,
  Segmented,
  FormFooter,
  useFormState,
} from "@/components/forms/FormKit";

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string | null;
}

export interface EditableTransaction {
  id: string;
  accountId: string;
  type: string;
  amount: string;
  description: string | null;
  date: string;
  categoryId: string | null;
  transferToId?: string | null;
}

interface AddTransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: EditableTransaction | null;
}

type TxType = "income" | "expense" | "transfer";

interface FormState {
  type: TxType;
  accountId: string;
  transferToId: string;
  amount: string;
  categoryId: string;
  date: string;
  description: string;
}

export default function AddTransactionForm({
  open,
  onClose,
  onSuccess,
  transaction,
}: AddTransactionFormProps) {
  const isEditing = !!transaction;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [padOpen, setPadOpen] = useState(false);

  const initial: FormState = useMemo(
    () => ({
      type: (transaction?.type as TxType) ?? "expense",
      accountId: transaction?.accountId ?? "",
      transferToId: transaction?.transferToId ?? "",
      amount: transaction ? String(Number(transaction.amount)) : "",
      categoryId: transaction?.categoryId ?? "",
      date: transaction?.date ?? dayjs().format("YYYY-MM-DD"),
      description: transaction?.description ?? "",
    }),
    [transaction],
  );

  const { state, set, setState } = useFormState<FormState>(open, initial);

  useEffect(() => {
    if (!open) return;
    setState(initial);
    setPadOpen(false);
    Promise.all([
      api.get<Account[]>("/accounts"),
      api.get<Category[]>("/categories"),
    ]).then(([a, c]) => {
      setAccounts(a);
      setCategories(c);
      // On a new transaction, default the Account field to the first option
      // (editing keeps the transaction's own account).
      if (!transaction && a.length > 0) {
        set("accountId", a[0]!.id);
      }
    });
  }, [open, initial, setState]);

  const filteredCategories = categories.filter(
    (c) => state.type === "transfer" || c.type === state.type,
  );

  const handleSubmit = async () => {
    if (!state.accountId || !state.amount || !state.date) {
      message.error("Account, amount, and date are required");
      return;
    }
    // The field may still hold an unresolved sum if the user submitted without
    // leaving it, so evaluate here rather than trusting the raw text.
    const amount = evaluateAmount(state.amount);
    if (amount === null || amount <= 0) {
      message.error("Enter a valid amount");
      return;
    }
    if (!state.categoryId) {
      message.error("Category is required");
      return;
    }
    if (state.type === "transfer" && !state.transferToId) {
      message.error("Transfer destination is required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        type: state.type,
        accountId: state.accountId,
        transferToId: state.type === "transfer" ? state.transferToId : null,
        amount: formatAmountResult(amount),
        categoryId: state.categoryId,
        date: state.date,
        description: state.description || null,
      };
      if (isEditing && transaction) {
        await api.put(`/transactions/${transaction.id}`, payload);
        message.success("Transaction updated");
      } else {
        await api.post("/transactions", payload);
        message.success("Transaction added");
      }
      // Cross-page refresh — Dashboard / other listeners refetch on this.
      window.dispatchEvent(new Event("transaction-added"));
      onClose();
      onSuccess();
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    try {
      await api.delete(`/transactions/${transaction.id}`);
      message.success("Deleted");
      window.dispatchEvent(new Event("transaction-added"));
      onClose();
      onSuccess();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const onTypeChange = (t: TxType) => {
    set("type", t);
    set("categoryId", "");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Transaction" : "New Transaction"}
      icon={isEditing ? "pencil" : "plus"}
      fullscreen
    >
      <FormBody>
        <Field label="Type" required>
          <Segmented<TxType>
            value={state.type}
            onChange={onTypeChange}
            options={[
              { value: "income", label: "Income" },
              { value: "expense", label: "Expense" },
              { value: "transfer", label: "Transfer" },
            ]}
          />
        </Field>
        {/* Anchors the pad so it drops below the row like a select menu. */}
        <div className="amt-anchor">
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
              <AmountInput
                value={state.amount}
                onChange={(v) => set("amount", v)}
                expression
                open={padOpen}
                onOpenChange={setPadOpen}
              />
            </Field>
          </Row>
          <AmountKeypad
            open={padOpen}
            value={state.amount}
            onChange={(v) => set("amount", v)}
            onClose={() => setPadOpen(false)}
          />
        </div>
        {state.type === "transfer" && (
          <Field label="Transfer To" required>
            <SelectInput
              value={state.transferToId}
              onChange={(v) => set("transferToId", v)}
              options={accounts
                .filter((a) => a.id !== state.accountId)
                .map((a) => ({ value: a.id, label: a.name }))}
              placeholder="Select destination"
            />
          </Field>
        )}
        <Row>
          <Field label="Category" required>
            <SelectInput
              value={state.categoryId}
              onChange={(v) => set("categoryId", v)}
              options={filteredCategories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              placeholder="Select category"
            />
          </Field>
          <Field label="Date" required>
            <DateInput value={state.date} onChange={(v) => set("date", v)} />
          </Field>
        </Row>
        <Field label="Note">
          <TextInput
            value={state.description}
            onChange={(v) => set("description", v)}
            placeholder="What was this for?"
          />
        </Field>
      </FormBody>
      <FormFooter
        primary={isEditing ? "Save Changes" : "Add Transaction"}
        onPrimary={handleSubmit}
        onCancel={onClose}
        loading={submitting}
        danger={isEditing ? "Delete" : undefined}
        onDanger={isEditing ? handleDelete : undefined}
      />
    </Modal>
  );
}
