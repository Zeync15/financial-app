import { useEffect, useState } from "react";
import {
  Typography,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Popconfirm,
  Spin,
  Empty,
  theme,
} from "antd";
import {
  PlusOutlined,
  BankOutlined,
  SaveOutlined,
  CreditCardOutlined,
  DollarOutlined,
  MobileOutlined,
  FundOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import IconCircle from "@/components/common/IconCircle";

const { Title } = Typography;
const { useToken } = theme;

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
  const isMobile = useIsMobile();
  const { token } = useToken();

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

  if (loading) {
    return <Spin size="large" className="flex justify-center mt-20" />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Title level={isMobile ? 4 : 3} className="mb-0!">
          Accounts
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Empty description="No accounts yet" />
      ) : (
        <div>
          {accounts.map((acc) => {
            const color = TYPE_COLORS[acc.type] || "#8c8c8c";
            const icon = TYPE_ICONS[acc.type] || <BankOutlined />;
            const balance = Number(acc.balance);
            const typeLabel =
              ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label ||
              acc.type;

            return (
              <div
                key={acc.id}
                role="button"
                tabIndex={0}
                onClick={() => openEdit(acc)}
                onKeyDown={(e) => e.key === "Enter" && openEdit(acc)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer active:opacity-60"
                style={{
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <IconCircle icon={icon} color={color} />

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div
                    className="font-medium text-sm truncate"
                    style={{ color: token.colorText }}
                  >
                    {acc.name}
                  </div>
                  <div
                    className="text-xs truncate"
                    style={{ color: token.colorTextTertiary }}
                  >
                    {typeLabel}
                    {acc.institution ? ` \u00B7 ${acc.institution}` : ""}
                  </div>
                </div>

                {/* Balance */}
                <div
                  className="shrink-0 font-semibold text-sm text-right"
                  style={{
                    color:
                      balance < 0 ? token.colorError : token.colorText,
                  }}
                >
                  {acc.currency}{" "}
                  {balance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        title={editing ? "Edit Account" : "New Account"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        footer={
          editing
            ? [
                <Popconfirm
                  key="delete"
                  title="Delete this account?"
                  onConfirm={async () => {
                    await handleDelete(editing.id);
                    setModalOpen(false);
                  }}
                  placement="top"
                >
                  <Button danger>Delete</Button>
                </Popconfirm>,
                <Button key="cancel" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>,
                <Button key="save" type="primary" onClick={handleSubmit}>
                  Save Changes
                </Button>,
              ]
            : undefined
        }
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
