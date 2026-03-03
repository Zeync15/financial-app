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
  message,
  Space,
  Tag,
  Popconfirm,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

const { Title } = Typography;

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit Card" },
  { value: "cash", label: "Cash" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "investment", label: "Investment" },
  { value: "loan", label: "Loan" },
];

const TYPE_COLORS: Record<string, string> = {
  checking: "blue",
  savings: "green",
  credit_card: "red",
  cash: "orange",
  ewallet: "purple",
  investment: "cyan",
  loan: "volcano",
};

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  institution: string | null;
  balance: string;
  isActive: boolean;
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    api
      .get<Account[]>("/accounts")
      .then(setAccounts)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };
  const openEdit = (acc: Account) => {
    setEditing(acc);
    form.setFieldsValue({ ...acc, balance: Number(acc.balance) });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await api.put(`/accounts/${editing.id}`, {
          ...values,
          balance: String(values.balance),
        });
        message.success("Account updated");
      } else {
        await api.post("/accounts", {
          ...values,
          balance: String(values.balance || 0),
        });
        message.success("Account created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/accounts/${id}`);
      message.success("Account deleted");
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: string) => (
        <Tag color={TYPE_COLORS[type]}>{type.replace("_", " ")}</Tag>
      ),
    },
    {
      title: "Institution",
      dataIndex: "institution",
      key: "institution",
      render: (v: string) => v || "-",
    },
    { title: "Currency", dataIndex: "currency", key: "currency" },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      align: "right" as const,
      render: (v: string) => Number(v).toFixed(2),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Account) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          />
          <Popconfirm
            title="Delete this account?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Title level={3} className="mb-0!">
          Accounts
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Account
        </Button>
      </div>
      <Table
        dataSource={accounts}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
      />
      <Modal
        title={editing ? "Edit Account" : "New Account"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ currency: "MYR", balance: 0 }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Maybank Savings" />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={ACCOUNT_TYPES} />
          </Form.Item>
          <Form.Item name="institution" label="Institution">
            <Input placeholder="e.g. Maybank" />
          </Form.Item>
          <Form.Item
            name="currency"
            label="Currency"
            rules={[{ required: true }]}
          >
            <Select
              options={["MYR", "USD", "EUR", "GBP", "SGD", "JPY", "CNY"].map(
                (c) => ({ value: c, label: c }),
              )}
            />
          </Form.Item>
          <Form.Item
            name="balance"
            label="Balance"
            rules={[{ required: true }]}
          >
            <InputNumber className="w-full" precision={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
