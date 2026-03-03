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
  Collapse,
  Popconfirm,
  Empty,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";

const { Title, Text } = Typography;

interface Holding {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string | null;
  type: string;
  quantity: string;
  avgCostPrice: string;
  currency: string;
}
interface Portfolio {
  id: string;
  name: string;
  currency: string;
  holdings: Holding[];
  totalValue: number;
}

export default function Investments() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [pModalOpen, setPModalOpen] = useState(false);
  const [hModalOpen, setHModalOpen] = useState(false);
  const [activePortfolio, setActivePortfolio] = useState<string | null>(null);
  const [pForm] = Form.useForm();
  const [hForm] = Form.useForm();

  const load = () => {
    setLoading(true);
    api
      .get<Portfolio[]>("/portfolios")
      .then(setPortfolios)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const createPortfolio = async () => {
    const values = await pForm.validateFields();
    try {
      await api.post("/portfolios", values);
      message.success("Portfolio created");
      setPModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const deletePortfolio = async (id: string) => {
    try {
      await api.delete(`/portfolios/${id}`);
      message.success("Portfolio deleted");
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const addHolding = async () => {
    const values = await hForm.validateFields();
    try {
      await api.post(`/portfolios/${activePortfolio}/holdings`, {
        ...values,
        quantity: String(values.quantity),
        avgCostPrice: String(values.avgCostPrice),
      });
      message.success("Holding added");
      setHModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const deleteHolding = async (portfolioId: string, holdingId: string) => {
    try {
      await api.delete(`/portfolios/${portfolioId}/holdings/${holdingId}`);
      message.success("Holding deleted");
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const holdingColumns = (portfolioId: string) => [
    {
      title: "Symbol",
      dataIndex: "symbol",
      key: "symbol",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (v: string) => v || "-",
    },
    { title: "Type", dataIndex: "type", key: "type" },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "qty",
      align: "right" as const,
      render: (v: string) => Number(v).toFixed(2),
    },
    {
      title: "Avg Cost",
      dataIndex: "avgCostPrice",
      key: "cost",
      align: "right" as const,
      render: (v: string) => Number(v).toFixed(2),
    },
    {
      title: "Value",
      key: "value",
      align: "right" as const,
      render: (_: unknown, r: Holding) =>
        (Number(r.quantity) * Number(r.avgCostPrice)).toFixed(2),
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_: unknown, r: Holding) => (
        <Popconfirm
          title="Delete?"
          onConfirm={() => deleteHolding(portfolioId, r.id)}
        >
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Title level={3} className="mb-0!">
          Investments
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            pForm.resetFields();
            setPModalOpen(true);
          }}
        >
          New Portfolio
        </Button>
      </div>

      {portfolios.length === 0 && !loading ? (
        <Empty description="No portfolios yet" />
      ) : (
        <Collapse
          items={portfolios.map((p) => ({
            key: p.id,
            label: (
              <div className="flex justify-between w-full pr-4">
                <Text strong>{p.name}</Text>
                <Text>
                  Total: {p.currency} {p.totalValue.toFixed(2)}
                </Text>
              </div>
            ),
            extra: (
              <Popconfirm
                title="Delete portfolio?"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  deletePortfolio(p.id);
                }}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            ),
            children: (
              <div>
                <div className="flex justify-end mb-2">
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setActivePortfolio(p.id);
                      hForm.resetFields();
                      setHModalOpen(true);
                    }}
                  >
                    Add Holding
                  </Button>
                </div>
                <Table
                  dataSource={p.holdings}
                  columns={holdingColumns(p.id)}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </div>
            ),
          }))}
        />
      )}

      <Modal
        title="New Portfolio"
        open={pModalOpen}
        onOk={createPortfolio}
        onCancel={() => setPModalOpen(false)}
        destroyOnClose
      >
        <Form
          form={pForm}
          layout="vertical"
          initialValues={{ currency: "MYR" }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Retirement Fund" />
          </Form.Item>
          <Form.Item name="currency" label="Currency">
            <Select
              options={["MYR", "USD", "SGD"].map((c) => ({
                value: c,
                label: c,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Add Holding"
        open={hModalOpen}
        onOk={addHolding}
        onCancel={() => setHModalOpen(false)}
        destroyOnClose
      >
        <Form form={hForm} layout="vertical" initialValues={{ type: "stock" }}>
          <Form.Item name="symbol" label="Symbol" rules={[{ required: true }]}>
            <Input placeholder="e.g. AAPL" />
          </Form.Item>
          <Form.Item name="name" label="Name">
            <Input placeholder="e.g. Apple Inc." />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "stock", label: "Stock" },
                { value: "etf", label: "ETF" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[{ required: true }]}
          >
            <InputNumber className="w-full" precision={2} min={0.01} />
          </Form.Item>
          <Form.Item
            name="avgCostPrice"
            label="Avg Cost Price"
            rules={[{ required: true }]}
          >
            <InputNumber className="w-full" precision={2} min={0.01} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
