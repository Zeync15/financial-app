import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Row,
  Statistic,
  Typography,
  Spin,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Popconfirm,
  Empty,
  theme,
} from "antd";
import {
  DollarOutlined,
  BankOutlined,
  RiseOutlined,
  FallOutlined,
  PlusOutlined,
  SaveOutlined,
  CreditCardOutlined,
  MobileOutlined,
  FundOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import IconCircle from "@/components/common/IconCircle";

const { Title } = Typography;
const { useToken } = theme;

interface DashboardData {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  monthlyExpense: number;
  accountCount: number;
  loanCount: number;
}

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  institution: string | null;
  balance: string;
  isActive: boolean;
}

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

function rmPrefix(icon: React.ReactNode) {
  return <span className="inline-flex items-center gap-1">{icon} RM</span>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form] = Form.useForm();
  const isMobile = useIsMobile();
  const { token } = useToken();

  // Summary + accounts are loaded together; an account change shifts the
  // totals, so both are refetched after every mutation.
  const load = () => {
    setLoading(true);
    return Promise.all([api.get<DashboardData>("/dashboard"), api.get<Account[]>("/accounts")])
      .then(([d, a]) => {
        setData(d);
        setAccounts(a);
      })
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

  if (loading && !data) {
    return <Spin size="large" className="flex justify-center mt-20" />;
  }

  const cardBodyStyle = { padding: isMobile ? 12 : 24 };
  const gutter = isMobile ? ([8, 8] as [number, number]) : ([16, 16] as [number, number]);
  const netWorth = data?.netWorth ?? 0;

  return (
    <div>
      <Title level={isMobile ? 4 : 3} className="mb-4!">
        Dashboard
      </Title>

      {/* Summary */}
      <Row gutter={gutter}>
        <Col xs={12} md={6}>
          <Card styles={{ body: cardBodyStyle }}>
            <Statistic
              title="Net Worth"
              value={netWorth}
              precision={2}
              prefix={rmPrefix(<DollarOutlined />)}
              valueStyle={netWorth < 0 ? { color: "#cf1322" } : undefined}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card styles={{ body: cardBodyStyle }}>
            <Statistic
              title="Total Assets"
              value={data?.totalAssets ?? 0}
              precision={2}
              prefix={rmPrefix(<BankOutlined />)}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card styles={{ body: cardBodyStyle }}>
            <Statistic
              title="Monthly Income"
              value={data?.monthlyIncome ?? 0}
              precision={2}
              prefix={rmPrefix(<RiseOutlined />)}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card styles={{ body: cardBodyStyle }}>
            <Statistic
              title="Monthly Expenses"
              value={data?.monthlyExpense ?? 0}
              precision={2}
              prefix={rmPrefix(<FallOutlined />)}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Accounts */}
      <div className="flex justify-between items-center mt-6 mb-2">
        <Title level={isMobile ? 5 : 4} className="mb-0!">
          Accounts
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {isMobile ? "" : "Add Account"}
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Empty description="No accounts yet" />
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          {accounts.map((acc, i) => {
            const color = TYPE_COLORS[acc.type] || "#8c8c8c";
            const icon = TYPE_ICONS[acc.type] || <BankOutlined />;
            const balance = Number(acc.balance);
            const typeLabel = ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label || acc.type;

            return (
              <div
                key={acc.id}
                role="button"
                tabIndex={0}
                onClick={() => openEdit(acc)}
                onKeyDown={(e) => e.key === "Enter" && openEdit(acc)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer active:opacity-60"
                style={{
                  borderBottom: i < accounts.length - 1 ? `1px solid ${token.colorBorderSecondary}` : undefined,
                }}
              >
                <IconCircle icon={icon} color={color} />

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate" style={{ color: token.colorText }}>
                    {acc.name}
                  </div>
                  <div className="text-xs truncate" style={{ color: token.colorTextTertiary }}>
                    {typeLabel}
                    {acc.institution ? ` · ${acc.institution}` : ""}
                  </div>
                </div>

                <div
                  className="shrink-0 font-semibold text-sm text-right"
                  style={{ color: balance < 0 ? token.colorError : token.colorText }}
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
        </Card>
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
        <Form form={form} layout="vertical" initialValues={{ currency: "MYR", balance: 0 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Maybank Savings" />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={ACCOUNT_TYPES} />
          </Form.Item>
          <Form.Item name="institution" label="Institution">
            <Input placeholder="e.g. Maybank" />
          </Form.Item>
          <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
            <Select options={["MYR", "USD", "EUR", "GBP", "SGD", "JPY", "CNY"].map((c) => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item name="balance" label="Balance" rules={[{ required: true }]}>
            <InputNumber className="w-full" precision={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
