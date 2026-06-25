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
  Popconfirm,
  Empty,
} from "antd";
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getQuote, isAutoPriceable } from "@/lib/priceService";
import { getRatesToMYR } from "@/lib/fxService";

dayjs.extend(relativeTime);

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
  currentPrice: string | null;
  priceUpdatedAt: string | null;
}
interface Portfolio {
  id: string;
  name: string;
  currency: string;
  holdings: Holding[];
  totalValue: number;
}
interface Totals {
  value: number; // market value, converted to MYR
  gain: number; // value - cost, in MYR
  cost: number; // cost basis, in MYR
  fxOk: boolean; // false if any currency couldn't be converted
}

const fmt = (n: number) =>
  n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Investments() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [hModalOpen, setHModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [hForm] = Form.useForm();
  const isMobile = useIsMobile();

  // All holdings, flattened across the (hidden) portfolio containers.
  const holdings = portfolios.flatMap((p) => p.holdings);

  const load = () => {
    setLoading(true);
    return api
      .get<Portfolio[]>("/portfolios")
      .then((data) => {
        setPortfolios(data);
        return data;
      })
      .finally(() => setLoading(false));
  };

  // Convert every holding's value + cost to MYR for a single grand total.
  const computeTotals = async (list: Holding[]) => {
    if (list.length === 0) {
      setTotals(null);
      return;
    }
    const rates = await getRatesToMYR(list.map((h) => h.currency));
    let value = 0;
    let cost = 0;
    let fxOk = true;
    for (const h of list) {
      const rate = rates[h.currency];
      if (rate == null) {
        fxOk = false;
        continue;
      }
      const qty = Number(h.quantity);
      const price = Number(h.currentPrice ?? h.avgCostPrice);
      value += qty * price * rate;
      cost += qty * Number(h.avgCostPrice) * rate;
    }
    setTotals({ value, gain: value - cost, cost, fxOk });
  };

  // A USD holding is "stale" if it has no price or the price isn't from today.
  const isStale = (h: Holding) =>
    isAutoPriceable(h.currency) &&
    (!h.priceUpdatedAt || !dayjs(h.priceUpdatedAt).isSame(dayjs(), "day"));

  // Write the latest Finnhub price back to each holding that needs it.
  // Returns true if anything changed. Silent on per-symbol failures.
  const fetchPrices = async (list: Holding[]) => {
    let changed = false;
    for (const h of list) {
      const price = await getQuote(h.symbol);
      if (price != null) {
        await api.put(`/portfolios/${h.portfolioId}/holdings/${h.id}`, {
          currentPrice: String(price),
          priceUpdatedAt: new Date().toISOString(),
        });
        changed = true;
      }
    }
    return changed;
  };

  // On load, snapshot any USD holdings whose price is missing or stale.
  // Self-terminating: after a write, the reload sees fresh prices and stops.
  const autoRefresh = async (data: Portfolio[]) => {
    const stale = data.flatMap((p) => p.holdings).filter(isStale);
    if (stale.length === 0) return;
    if (await fetchPrices(stale)) load();
  };

  // Manual "Refresh prices" button: force-refresh every USD holding.
  const refreshPrices = async () => {
    setRefreshing(true);
    try {
      const usd = holdings.filter((h) => isAutoPriceable(h.currency));
      if (usd.length === 0) {
        message.info("No US holdings to price. Enter MYR prices manually.");
        return;
      }
      if (await fetchPrices(usd)) {
        message.success("Prices updated");
        await load();
      } else {
        message.warning("No prices updated — check your Finnhub key and symbols.");
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Manual price entry for non-USD holdings (e.g. Bursa Malaysia REITs).
  const savePrice = async (h: Holding, raw: string) => {
    const val = Number(raw);
    if (!raw || isNaN(val) || val <= 0) return;
    if (h.currentPrice && Number(h.currentPrice) === val) return;
    try {
      await api.put(`/portfolios/${h.portfolioId}/holdings/${h.id}`, {
        currentPrice: String(val),
        priceUpdatedAt: new Date().toISOString(),
      });
      message.success("Price updated");
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  useEffect(() => {
    load().then((data) => {
      if (data) autoRefresh(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute the MYR total whenever holdings change.
  useEffect(() => {
    computeTotals(holdings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolios]);

  // Holdings live in a single hidden default portfolio. Create it on first add.
  const ensureDefaultPortfolio = async (): Promise<string> => {
    if (portfolios.length > 0) return portfolios[0]!.id;
    const p = await api.post<{ id: string }>("/portfolios", {
      name: "My Investments",
      currency: "MYR",
    });
    return p.id;
  };

  const addHolding = async () => {
    const values = await hForm.validateFields();
    try {
      const pid = await ensureDefaultPortfolio();
      await api.post(`/portfolios/${pid}/holdings`, {
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

  const deleteHolding = async (h: Holding) => {
    try {
      await api.delete(`/portfolios/${h.portfolioId}/holdings/${h.id}`);
      message.success("Holding removed");
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const columns = [
    {
      title: "Symbol",
      key: "symbol",
      render: (_: unknown, r: Holding) => (
        <div>
          <Text strong>{r.symbol}</Text>{" "}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.currency}
          </Text>
          {r.name ? (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {r.name}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "qty",
      align: "right" as const,
      responsive: ["md" as const],
      render: (v: string) => Number(v).toFixed(2),
    },
    {
      title: "Avg Cost",
      dataIndex: "avgCostPrice",
      key: "cost",
      align: "right" as const,
      responsive: ["md" as const],
      render: (v: string) => Number(v).toFixed(2),
    },
    {
      title: "Price",
      key: "price",
      align: "right" as const,
      render: (_: unknown, r: Holding) => {
        if (isAutoPriceable(r.currency)) {
          return r.currentPrice ? Number(r.currentPrice).toFixed(2) : "—";
        }
        // Manual entry for non-USD (e.g. Bursa Malaysia) holdings.
        return (
          <InputNumber
            size="small"
            defaultValue={r.currentPrice ? Number(r.currentPrice) : undefined}
            precision={2}
            min={0}
            placeholder="Set"
            controls={false}
            style={{ width: 90 }}
            onPressEnter={(e) => savePrice(r, (e.target as HTMLInputElement).value)}
            onBlur={(e) => savePrice(r, e.target.value)}
          />
        );
      },
    },
    {
      title: "Market Value",
      key: "value",
      align: "right" as const,
      render: (_: unknown, r: Holding) => {
        const price = Number(r.currentPrice ?? r.avgCostPrice);
        return `${r.currency} ${fmt(Number(r.quantity) * price)}`;
      },
    },
    {
      title: "Gain/Loss",
      key: "gain",
      align: "right" as const,
      render: (_: unknown, r: Holding) => {
        if (r.currentPrice == null) return <Text type="secondary">—</Text>;
        const cost = Number(r.avgCostPrice);
        const cur = Number(r.currentPrice);
        const gain = (cur - cost) * Number(r.quantity);
        const pct = cost > 0 ? (cur / cost - 1) * 100 : 0;
        const up = gain >= 0;
        return (
          <Text type={up ? "success" : "danger"}>
            {up ? "+" : ""}
            {fmt(gain)} ({up ? "+" : ""}
            {pct.toFixed(1)}%)
          </Text>
        );
      },
    },
    {
      title: "As of",
      key: "asof",
      responsive: ["md" as const],
      render: (_: unknown, r: Holding) =>
        r.priceUpdatedAt ? (
          <Text type="secondary">{dayjs(r.priceUpdatedAt).fromNow()}</Text>
        ) : (
          "—"
        ),
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_: unknown, r: Holding) => (
        <Popconfirm title="Remove holding?" onConfirm={() => deleteHolding(r)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Title level={isMobile ? 4 : 3} className="mb-0!">
          Investments
        </Title>
        <div className="flex gap-2">
          <Button
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={refreshPrices}
          >
            {isMobile ? "" : "Refresh prices"}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              hForm.resetFields();
              setHModalOpen(true);
            }}
          >
            {isMobile ? "" : "Add Holding"}
          </Button>
        </div>
      </div>

      {totals && (
        <div className="flex gap-8 mb-4 flex-wrap">
          <div>
            <Text type="secondary">Total Value</Text>
            <div>
              <Text strong style={{ fontSize: 20 }}>
                {totals.fxOk ? "" : "≈ "}RM {fmt(totals.value)}
              </Text>
            </div>
          </div>
          <div>
            <Text type="secondary">Total Gain/Loss</Text>
            <div>
              <Text
                strong
                type={totals.gain >= 0 ? "success" : "danger"}
                style={{ fontSize: 20 }}
              >
                {totals.gain >= 0 ? "+" : ""}
                RM {fmt(totals.gain)}
                {totals.cost > 0
                  ? ` (${totals.gain >= 0 ? "+" : ""}${(
                      (totals.gain / totals.cost) *
                      100
                    ).toFixed(1)}%)`
                  : ""}
              </Text>
            </div>
          </div>
        </div>
      )}

      {holdings.length === 0 && !loading ? (
        <Empty description="No investments yet — add your first holding" />
      ) : (
        <Table
          dataSource={holdings}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          loading={loading}
        />
      )}

      <Modal
        title="Add Holding"
        open={hModalOpen}
        onOk={addHolding}
        onCancel={() => setHModalOpen(false)}
        destroyOnClose
      >
        <Form
          form={hForm}
          layout="vertical"
          initialValues={{ type: "etf", currency: "MYR" }}
        >
          <Form.Item name="symbol" label="Symbol" rules={[{ required: true }]}>
            <Input placeholder="e.g. VGT" />
          </Form.Item>
          <Form.Item name="name" label="Name">
            <Input placeholder="e.g. Vanguard Information Technology ETF" />
          </Form.Item>
          <Form.Item
            name="currency"
            label="Currency"
            rules={[{ required: true }]}
            extra="USD prices are fetched automatically. Other currencies are entered manually."
          >
            <Select
              options={["MYR", "USD", "SGD"].map((c) => ({ value: c, label: c }))}
            />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "etf", label: "ETF" },
                { value: "stock", label: "Stock" },
              ]}
            />
          </Form.Item>
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
            <InputNumber className="w-full" precision={4} min={0.0001} />
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
