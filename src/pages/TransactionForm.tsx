import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Form,
  Select,
  InputNumber,
  DatePicker,
  Segmented,
  Button,
  Input,
  Row,
  Col,
  Popconfirm,
  message,
  theme,
} from "antd";
import { ArrowLeftOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import type { EditableTransaction } from "@/components/transactions/AddTransactionForm";

const { useToken } = theme;

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

const FIELD_MB = { marginBottom: 16 };
const FULL_W = { width: "100%" };

export default function TransactionForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { token } = useToken();

  const [form] = Form.useForm();
  const [txType, setTxType] = useState("expense");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!id;
  const initialTx = (location.state as { transaction?: EditableTransaction } | null)
    ?.transaction;

  useEffect(() => {
    Promise.all([
      api.get<Account[]>("/accounts"),
      api.get<Category[]>("/categories"),
    ]).then(([a, c]) => {
      setAccounts(a);
      setCategories(c);
    });

    if (isEditing && initialTx) {
      setTxType(initialTx.type);
      form.setFieldsValue({
        type: initialTx.type,
        accountId: initialTx.accountId,
        amount: Number(initialTx.amount),
        categoryId: initialTx.categoryId,
        date: dayjs(initialTx.date),
        description: initialTx.description,
        transferToId: initialTx.transferToId,
      });
    } else {
      form.setFieldsValue({ type: "expense", date: dayjs() });
    }
  }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        amount: String(values.amount),
        date: values.date.format("YYYY-MM-DD"),
      };
      if (isEditing && id) {
        await api.put(`/transactions/${id}`, payload);
        message.success("Transaction updated");
      } else {
        await api.post("/transactions", payload);
        message.success("Transaction added");
      }
      window.dispatchEvent(new Event("transaction-added"));
      navigate(-1);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await api.delete(`/transactions/${id}`);
      message.success("Deleted");
      window.dispatchEvent(new Event("transaction-added"));
      navigate(-1);
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const filteredCategories = categories.filter(
    (c) => txType === "transfer" || c.type === txType,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: token.colorBgContainer }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 shrink-0 border-b"
        style={{
          borderColor: token.colorBorderSecondary,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: 12,
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          size="large"
        />
        <span className="font-semibold text-base">
          {isEditing ? "Edit Transaction" : "New Transaction"}
        </span>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: "expense", date: dayjs() }}
          size="large"
        >
          {/* Type */}
          <Form.Item name="type" label="Type" rules={[{ required: true }]} style={FIELD_MB}>
            <Segmented
              block
              options={[
                { value: "income", label: "Income" },
                { value: "expense", label: "Expense" },
                { value: "transfer", label: "Transfer" },
              ]}
              onChange={(v) => {
                setTxType(v as string);
                form.setFieldValue("categoryId", undefined);
              }}
            />
          </Form.Item>

          {/* Account + Amount in 2 columns */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="accountId"
                label="Account"
                rules={[{ required: true }]}
                style={FIELD_MB}
              >
                <Select
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                  placeholder="Account"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount"
                rules={[{ required: true }]}
                style={FIELD_MB}
              >
                <InputNumber
                  style={FULL_W}
                  precision={2}
                  min={0.01}
                  inputMode="decimal"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Transfer To */}
          {txType === "transfer" && (
            <Form.Item
              name="transferToId"
              label="Transfer To"
              rules={[{ required: true }]}
              style={FIELD_MB}
            >
              <Select
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                placeholder="Destination account"
              />
            </Form.Item>
          )}

          {/* Category + Date in 2 columns */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="categoryId" label="Category" style={FIELD_MB}>
                <Select
                  allowClear
                  placeholder="Category"
                  options={filteredCategories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true }]}
                style={FIELD_MB}
              >
                <DatePicker style={FULL_W} inputReadOnly />
              </Form.Item>
            </Col>
          </Row>

          {/* Note */}
          <Form.Item name="description" label="Note" style={{ marginBottom: 24 }}>
            <Input placeholder="What was this for?" />
          </Form.Item>

          {/* Submit */}
          <Button
            type="primary"
            block
            size="large"
            onClick={handleSubmit}
            loading={submitting}
            style={{ marginBottom: 12 }}
          >
            {isEditing ? "Save Changes" : "Add Transaction"}
          </Button>

          {/* Delete (edit mode only) */}
          {isEditing && (
            <Popconfirm
              title="Delete this transaction?"
              onConfirm={handleDelete}
              placement="top"
            >
              <Button danger block size="large" icon={<DeleteOutlined />}>
                Delete Transaction
              </Button>
            </Popconfirm>
          )}
        </Form>
      </div>
    </div>
  );
}
