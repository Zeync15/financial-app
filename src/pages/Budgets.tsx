import { useEffect, useState } from "react";
import {
  Typography,
  Card,
  Row,
  Col,
  Progress,
  Button,
  message,
  Popconfirm,
  Empty,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Modal,
  FormBody,
  Field,
  AmountInput,
  SelectInput,
  FormFooter,
  useFormState,
} from "@/components/forms/FormKit";

const { Text } = Typography;

interface Budget {
  id: string;
  categoryId: string;
  name: string | null;
  amount: string;
  currency: string;
  period: string;
  categoryName: string | null;
  categoryColor: string | null;
  spent: string;
}
interface Category {
  id: string;
  name: string;
  type: string;
}

const PERIOD_OPTS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

interface BudgetFormState {
  categoryId: string;
  amount: string;
  period: string;
}

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { state, set } = useFormState<BudgetFormState>(modalOpen, {
    categoryId: "",
    amount: "",
    period: "monthly",
  });
  const isMobile = useIsMobile();

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Budget[]>("/budgets"),
      api.get<Category[]>("/categories"),
    ])
      .then(([b, c]) => {
        setBudgets(b);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!state.categoryId || !state.amount || !state.period) {
      message.error("Category, amount, and period are required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/budgets", {
        categoryId: state.categoryId,
        amount: String(state.amount),
        period: state.period,
        currency: "MYR",
      });
      message.success("Budget created");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/budgets/${id}`);
      message.success("Budget deleted");
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div>
      <div className="titlebar">
        <h1 className="h1" style={{ fontSize: isMobile ? 22 : 26 }}>
          Budgets
        </h1>
        <button
          className="btn-primary-emerald"
          onClick={() => setModalOpen(true)}
        >
          <PlusOutlined />
          {isMobile ? "Add" : "Add Budget"}
        </button>
      </div>

      {budgets.length === 0 && !loading ? (
        <Empty description="No budgets yet" />
      ) : (
        <Row gutter={isMobile ? [8, 8] : [16, 16]}>
          {budgets.map((b) => {
            const spent = Number(b.spent);
            const budget = Number(b.amount);
            const percent =
              budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
            const isOver = spent > budget;
            return (
              <Col xs={24} md={8} key={b.id}>
                <Card
                  title={b.categoryName || b.name || "Budget"}
                  styles={{ body: { padding: isMobile ? 12 : 24 } }}
                  extra={
                    <Popconfirm
                      title="Delete?"
                      onConfirm={() => handleDelete(b.id)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  }
                >
                  <div className="mb-2">
                    <Text type="secondary">{b.period} budget</Text>
                  </div>
                  <Progress
                    percent={Math.round(percent)}
                    status={isOver ? "exception" : "active"}
                    strokeColor={isOver ? "#ff4d4f" : "#1677ff"}
                  />
                  <div className="flex justify-between mt-2">
                    <Text>Spent: RM {spent.toFixed(2)}</Text>
                    <Text>Budget: RM {budget.toFixed(2)}</Text>
                  </div>
                  {isOver && (
                    <Text type="danger" className="block mt-1">
                      Over budget by RM {(spent - budget).toFixed(2)}
                    </Text>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Budget"
        icon="plus"
      >
        <FormBody>
          <Field label="Category" required>
            <SelectInput
              value={state.categoryId}
              onChange={(v) => set("categoryId", v)}
              options={expenseCategories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              placeholder="Select category"
            />
          </Field>
          <Field label="Budget Amount" required>
            <AmountInput
              value={state.amount}
              onChange={(v) => set("amount", v)}
            />
          </Field>
          <Field label="Period" required>
            <SelectInput
              value={state.period}
              onChange={(v) => set("period", v)}
              options={PERIOD_OPTS}
            />
          </Field>
        </FormBody>
        <FormFooter
          primary="Add Budget"
          onPrimary={handleCreate}
          onCancel={() => setModalOpen(false)}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
