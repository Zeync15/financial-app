import { useEffect, useState } from "react";
import {
  Typography,
  Card,
  Row,
  Col,
  Progress,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Popconfirm,
  Empty,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

const { Title, Text } = Typography;

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

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [catForm] = Form.useForm();

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Budget[]>("/budgets"),
      api.get<Category[]>("/budgets/categories"),
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
    const values = await form.validateFields();
    try {
      await api.post("/budgets", { ...values, amount: String(values.amount) });
      message.success("Budget created");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message);
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

  const handleCreateCategory = async () => {
    const values = await catForm.validateFields();
    try {
      await api.post("/budgets/categories", values);
      message.success("Category created");
      setCatModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Title level={3} className="mb-0!">
          Budgets
        </Title>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              catForm.resetFields();
              setCatModalOpen(true);
            }}
          >
            Add Category
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              form.resetFields();
              setModalOpen(true);
            }}
          >
            Add Budget
          </Button>
        </div>
      </div>

      {budgets.length === 0 && !loading ? (
        <Empty description="No budgets yet. Create categories first, then add budgets." />
      ) : (
        <Row gutter={[16, 16]}>
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
        title="New Budget"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ period: "monthly", currency: "MYR" }}
        >
          <Form.Item
            name="categoryId"
            label="Category"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="Select category"
              options={expenseCategories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Budget Amount"
            rules={[{ required: true }]}
          >
            <InputNumber className="w-full" precision={2} min={0.01} />
          </Form.Item>
          <Form.Item name="period" label="Period" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="New Category"
        open={catModalOpen}
        onOk={handleCreateCategory}
        onCancel={() => setCatModalOpen(false)}
        destroyOnClose
      >
        <Form
          form={catForm}
          layout="vertical"
          initialValues={{ type: "expense" }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Groceries" />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
              ]}
            />
          </Form.Item>
          <Form.Item name="color" label="Color">
            <Input placeholder="#1677ff" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
