import { useEffect, useState } from "react";
import {
  Typography,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  message,
  Tag,
  Popconfirm,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "@/lib/api";

const { Title } = Typography;

interface Transaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: string;
  amount: string;
  description: string | null;
  date: string;
  categoryName: string | null;
  categoryColor: string | null;
  accountName: string | null;
}

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

export default function Transactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [txType, setTxType] = useState("expense");

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Transaction[]>("/transactions"),
      api.get<Account[]>("/accounts"),
      api.get<Category[]>("/budgets/categories"),
    ])
      .then(([t, a, c]) => {
        setTxns(t);
        setAccounts(a);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      await api.post("/transactions", {
        ...values,
        amount: String(values.amount),
        date: values.date.format("YYYY-MM-DD"),
      });
      message.success("Transaction added");
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/transactions/${id}`);
      message.success("Transaction deleted");
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const columns = [
    { title: "Date", dataIndex: "date", key: "date", width: 110 },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (t: string) => (
        <Tag
          color={t === "income" ? "green" : t === "expense" ? "red" : "blue"}
        >
          {t}
        </Tag>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (v: string) => v || "-",
    },
    {
      title: "Category",
      dataIndex: "categoryName",
      key: "category",
      render: (v: string) => v || "-",
    },
    { title: "Account", dataIndex: "accountName", key: "account" },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (v: string, r: Transaction) => (
        <span
          className={
            r.type === "income"
              ? "text-green-600"
              : r.type === "expense"
                ? "text-red-600"
                : ""
          }
        >
          {Number(v).toFixed(2)}
        </span>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_: unknown, r: Transaction) => (
        <Popconfirm title="Delete?" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const filteredCategories = categories.filter(
    (c) => txType === "transfer" || c.type === txType,
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Title level={3} className="mb-0!">
          Transactions
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields();
            form.setFieldValue("type", "expense");
            setTxType("expense");
            setModalOpen(true);
          }}
        >
          Add Transaction
        </Button>
      </div>
      <Table
        dataSource={txns}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
      <Modal
        title="New Transaction"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: "expense", date: dayjs() }}
        >
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              onChange={(v) => setTxType(v)}
              options={[
                { value: "income", label: "Income" },
                { value: "expense", label: "Expense" },
                { value: "transfer", label: "Transfer" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="accountId"
            label="Account"
            rules={[{ required: true }]}
          >
            <Select
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              placeholder="Select account"
            />
          </Form.Item>
          {txType === "transfer" && (
            <Form.Item
              name="transferToId"
              label="Transfer To"
              rules={[{ required: true }]}
            >
              <Select
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                placeholder="Select destination"
              />
            </Form.Item>
          )}
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber className="w-full" precision={2} min={0.01} />
          </Form.Item>
          <Form.Item name="categoryId" label="Category">
            <Select
              allowClear
              placeholder="Select category"
              options={filteredCategories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="What was this for?" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
