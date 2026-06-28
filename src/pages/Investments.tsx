import { useEffect, useMemo, useState } from "react";
import { Spin, Empty, Popconfirm, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  RiseOutlined,
  FallOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getQuote, isAutoPriceable } from "@/lib/priceService";
import { getRatesToMYR } from "@/lib/fxService";
import {
  Modal,
  FormBody,
  Row,
  Field,
  TextInput,
  AmountInput,
  SelectInput,
  FormFooter,
  useFormState,
} from "@/components/forms/FormKit";

dayjs.extend(relativeTime);

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

// Stable color per symbol, drawn from the palette below.
const PALETTE = [
  "#1ec98a", "#1677ff", "#fa8c16", "#722ed1", "#13c2c2",
  "#ff6b6b", "#faad14", "#eb2f96", "#52c41a", "#9aa3ad",
];
function colorFor(symbol: string) {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length]!;
}

const TYPE_OPTS = [
  { value: "etf", label: "ETF" },
  { value: "stock", label: "Stock" },
  { value: "crypto", label: "Crypto" },
  { value: "bond", label: "Bond" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "reit", label: "REIT" },
];

const CUR_OPTS = ["MYR", "USD", "SGD", "EUR", "GBP"];

const fmt = (n: number) =>
  n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = (n: number) => Math.round(n).toLocaleString();

interface EnrichedHolding {
  raw: Holding;
  color: string;
  units: number;
  avgCost: number;
  price: number;
  hasMarketPrice: boolean;
  marketValueNative: number;
  costNative: number;
  gainNative: number;
  gainPct: number;
  marketValueMyr: number;
  costMyr: number;
  weight: number;
}

function Donut({
  size = 150,
  thick = 18,
  data,
  children,
}: {
  size?: number;
  thick?: number;
  data: { color: string; weight: number }[];
  children?: React.ReactNode;
}) {
  const r = (size - thick) / 2;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={thick}
        />
        {data.map((d, i) => {
          const len = (d.weight / 100) * c;
          const seg = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thick}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-off}
            />
          );
          off += len;
          return seg;
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function TickerBadge({ h, size = 44 }: { h: EnrichedHolding; size?: number }) {
  return (
    <span
      className="ticker"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.3,
        background: `color-mix(in oklab, ${h.color} 22%, transparent)`,
        color: h.color,
      }}
    >
      {h.raw.symbol.slice(0, 3)}
    </span>
  );
}

function GLPill({ value, pct }: { value: number; pct: number }) {
  const down = value < 0;
  return (
    <span className={"pill " + (down ? "down" : "up")}>
      {down ? <FallOutlined /> : <RiseOutlined />}
      {(value >= 0 ? "+" : "−") + Math.abs(pct).toFixed(1) + "%"}
    </span>
  );
}

function HoldingCardDesktop({
  h,
  onDelete,
  onSavePrice,
}: {
  h: EnrichedHolding;
  onDelete: () => void;
  onSavePrice?: (raw: string) => void;
}) {
  const down = h.gainNative < 0;
  const typeLabel = TYPE_OPTS.find((t) => t.value === h.raw.type)?.label ?? h.raw.type;
  return (
    <div className="glass" style={{ padding: 20, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <TickerBadge h={h} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--t1)" }}>
              {h.raw.symbol}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--t3)",
                border: "1px solid var(--line)",
                borderRadius: 5,
                padding: "1px 6px",
              }}
            >
              {typeLabel}
            </span>
            <span style={{ fontSize: 11, color: "var(--t3)" }}>{h.raw.currency}</span>
          </div>
          {h.raw.name && (
            <div
              style={{
                fontSize: 12.5,
                color: "var(--t3)",
                marginTop: 3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {h.raw.name}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="stat-val" style={{ fontSize: 18 }}>
            {h.raw.currency} {fmt(h.marketValueNative)}
          </div>
          {h.hasMarketPrice && (
            <div style={{ marginTop: 4 }}>
              <GLPill value={h.gainNative} pct={h.gainPct} />
            </div>
          )}
        </div>
        <Popconfirm title="Remove holding?" onConfirm={onDelete}>
          <button
            className="icon-btn sm danger"
            title="Remove"
            style={{ marginLeft: 4 }}
          >
            <DeleteOutlined />
          </button>
        </Popconfirm>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <div className="stat-label">Price</div>
          {onSavePrice ? (
            <input
              defaultValue={h.raw.currentPrice ?? ""}
              placeholder="Set"
              className="fld-input"
              style={{ height: 32, padding: "0 8px", fontSize: 14 }}
              onBlur={(e) => onSavePrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          ) : (
            <div className="stat-val">{fmt(h.price)}</div>
          )}
        </div>
        <div>
          <div className="stat-label">Units</div>
          <div className="stat-val">{h.units}</div>
        </div>
        <div>
          <div className="stat-label">Avg cost</div>
          <div className="stat-val">{fmt(h.avgCost)}</div>
        </div>
        <div>
          <div className="stat-label">Gain / Loss</div>
          {h.hasMarketPrice ? (
            <div
              className="stat-val"
              style={{
                color: down ? "var(--neg)" : "var(--pos)",
                fontSize: 15,
                whiteSpace: "nowrap",
              }}
            >
              {down ? "−" : "+"}
              {h.raw.currency} {fmt(Math.abs(h.gainNative))}
            </div>
          ) : (
            <div className="stat-val" style={{ color: "var(--t3)" }}>
              —
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12.5,
          marginBottom: 7,
        }}
      >
        <span style={{ color: "var(--t2)" }}>
          Portfolio weight{" "}
          <span style={{ color: "var(--t4)" }}>· {h.weight.toFixed(1)}%</span>
        </span>
        <span style={{ color: "var(--t2)" }}>
          Cost basis{" "}
          <span
            style={{
              color: "var(--t1)",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {h.raw.currency} {fmt(h.costNative)}
          </span>
        </span>
      </div>
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{ width: `${h.weight}%`, background: h.color }}
        />
      </div>
    </div>
  );
}

function HoldingCardMobile({
  h,
  onDelete,
  onSavePrice,
}: {
  h: EnrichedHolding;
  onDelete: () => void;
  onSavePrice?: (raw: string) => void;
}) {
  const down = h.gainNative < 0;
  return (
    <div className="glass" style={{ padding: 15 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 13 }}>
        <TickerBadge h={h} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--t1)" }}>
            {h.raw.symbol}
          </div>
          {h.raw.name && (
            <div
              style={{
                fontSize: 11.5,
                color: "var(--t3)",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {h.raw.name}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="stat-val" style={{ fontSize: 15 }}>
            {h.raw.currency} {fmt0(h.marketValueNative)}
          </div>
          {h.hasMarketPrice && (
            <div style={{ marginTop: 4, display: "flex", justifyContent: "flex-end" }}>
              <GLPill value={h.gainNative} pct={h.gainPct} />
            </div>
          )}
        </div>
        <Popconfirm title="Remove holding?" onConfirm={onDelete}>
          <button className="icon-btn sm danger" title="Remove">
            <DeleteOutlined />
          </button>
        </Popconfirm>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <div className="stat-label" style={{ fontSize: 10.5 }}>
            Price
          </div>
          {onSavePrice ? (
            <input
              defaultValue={h.raw.currentPrice ?? ""}
              placeholder="Set"
              className="fld-input"
              style={{ height: 28, padding: "0 8px", fontSize: 13 }}
              onBlur={(e) => onSavePrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          ) : (
            <div className="stat-val" style={{ fontSize: 14 }}>
              {fmt(h.price)}
            </div>
          )}
        </div>
        <div>
          <div className="stat-label" style={{ fontSize: 10.5 }}>
            Units
          </div>
          <div className="stat-val" style={{ fontSize: 14 }}>
            {h.units}
          </div>
        </div>
        <div>
          <div className="stat-label" style={{ fontSize: 10.5 }}>
            G/L
          </div>
          {h.hasMarketPrice ? (
            <div
              className="stat-val"
              style={{
                fontSize: 14,
                color: down ? "var(--neg)" : "var(--pos)",
              }}
            >
              {down ? "−" : "+"}
              {fmt0(Math.abs(h.gainNative))}
            </div>
          ) : (
            <div className="stat-val" style={{ fontSize: 14, color: "var(--t3)" }}>
              —
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface HoldingFormState {
  symbol: string;
  name: string;
  currency: string;
  type: string;
  quantity: string;
  avgCostPrice: string;
}

function AddHoldingModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: HoldingFormState) => Promise<void>;
}) {
  const { state, set } = useFormState<HoldingFormState>(open, {
    symbol: "",
    name: "",
    currency: "MYR",
    type: "etf",
    quantity: "",
    avgCostPrice: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!state.symbol || !state.quantity || !state.avgCostPrice) {
      message.error("Symbol, quantity, and avg cost price are required");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(state);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Holding" icon="plus">
      <FormBody>
        <Field label="Symbol" required>
          <TextInput
            value={state.symbol}
            onChange={(v) => set("symbol", v.toUpperCase())}
            placeholder="e.g. VGT"
            autoFocus
          />
        </Field>
        <Field label="Name">
          <TextInput
            value={state.name}
            onChange={(v) => set("name", v)}
            placeholder="e.g. Vanguard Information Technology ETF"
          />
        </Field>
        <Field
          label="Currency"
          required
          hint="USD prices are fetched automatically. Other currencies are entered manually."
        >
          <SelectInput
            value={state.currency}
            onChange={(v) => set("currency", v)}
            options={CUR_OPTS}
          />
        </Field>
        <Field label="Type" required>
          <SelectInput
            value={state.type}
            onChange={(v) => set("type", v)}
            options={TYPE_OPTS}
          />
        </Field>
        <Row>
          <Field label="Quantity" required>
            <TextInput
              value={state.quantity}
              onChange={(v) => set("quantity", v)}
              placeholder="0"
            />
          </Field>
          <Field label="Avg Cost Price" required>
            <AmountInput
              value={state.avgCostPrice}
              onChange={(v) => set("avgCostPrice", v)}
              currency={state.currency}
            />
          </Field>
        </Row>
      </FormBody>
      <FormFooter
        primary="Add Holding"
        onPrimary={submit}
        onCancel={onClose}
        loading={saving}
      />
    </Modal>
  );
}

export default function Investments() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hModalOpen, setHModalOpen] = useState(false);
  const [rates, setRates] = useState<Record<string, number | null>>({});
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  // `/investments/new` routes to this page too — open the AddHolding form
  // automatically and navigate back to `/investments` on close.
  const wantsNew = location.pathname.endsWith("/investments/new");

  useEffect(() => {
    if (wantsNew) setHModalOpen(true);
    else setHModalOpen(false);
  }, [wantsNew]);

  const closeAddHolding = () => {
    setHModalOpen(false);
    if (wantsNew) navigate("/investments", { replace: true });
  };

  const holdings = useMemo(
    () => portfolios.flatMap((p) => p.holdings),
    [portfolios],
  );

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

  // Re-fetch FX whenever the currency set changes.
  useEffect(() => {
    if (holdings.length === 0) {
      setRates({});
      return;
    }
    getRatesToMYR(holdings.map((h) => h.currency)).then(setRates);
  }, [holdings]);

  const isStale = (h: Holding) =>
    isAutoPriceable(h.currency) &&
    (!h.priceUpdatedAt || !dayjs(h.priceUpdatedAt).isSame(dayjs(), "day"));

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

  const autoRefresh = async (data: Portfolio[]) => {
    const stale = data.flatMap((p) => p.holdings).filter(isStale);
    if (stale.length === 0) return;
    if (await fetchPrices(stale)) load();
  };

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

  const ensureDefaultPortfolio = async (): Promise<string> => {
    if (portfolios.length > 0) return portfolios[0]!.id;
    const p = await api.post<{ id: string }>("/portfolios", {
      name: "My Investments",
      currency: "MYR",
    });
    return p.id;
  };

  const addHolding = async (values: HoldingFormState) => {
    try {
      const pid = await ensureDefaultPortfolio();
      await api.post(`/portfolios/${pid}/holdings`, {
        symbol: values.symbol,
        name: values.name || null,
        type: values.type,
        currency: values.currency,
        quantity: String(values.quantity),
        avgCostPrice: String(values.avgCostPrice),
      });
      message.success("Holding added");
      closeAddHolding();
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

  const enriched = useMemo<EnrichedHolding[]>(() => {
    const items = holdings.map((h) => {
      const units = Number(h.quantity);
      const avgCost = Number(h.avgCostPrice);
      const hasMarketPrice = h.currentPrice != null && Number(h.currentPrice) > 0;
      const price = hasMarketPrice ? Number(h.currentPrice) : avgCost;
      const marketValueNative = units * price;
      const costNative = units * avgCost;
      const gainNative = marketValueNative - costNative;
      const gainPct = costNative > 0 ? (gainNative / costNative) * 100 : 0;
      const rate = rates[h.currency] ?? null;
      const marketValueMyr = rate != null ? marketValueNative * rate : 0;
      const costMyr = rate != null ? costNative * rate : 0;
      return {
        raw: h,
        color: colorFor(h.symbol),
        units,
        avgCost,
        price,
        hasMarketPrice,
        marketValueNative,
        costNative,
        gainNative,
        gainPct,
        marketValueMyr,
        costMyr,
        weight: 0,
      };
    });
    const totalMyr = items.reduce((s, h) => s + h.marketValueMyr, 0) || 1;
    for (const h of items) h.weight = (h.marketValueMyr / totalMyr) * 100;
    return items.sort((a, b) => b.marketValueMyr - a.marketValueMyr);
  }, [holdings, rates]);

  const totals = useMemo(() => {
    const value = enriched.reduce((s, h) => s + h.marketValueMyr, 0);
    const cost = enriched.reduce((s, h) => s + h.costMyr, 0);
    const gain = value - cost;
    const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
    const fxOk = enriched.every((h) => rates[h.raw.currency] != null);
    return { value, cost, gain, gainPct, fxOk };
  }, [enriched, rates]);

  const best = enriched.length > 0
    ? enriched.reduce((a, b) => (b.gainPct > a.gainPct ? b : a))
    : null;
  const worst = enriched.length > 0
    ? enriched.reduce((a, b) => (b.gainPct < a.gainPct ? b : a))
    : null;

  if (loading && holdings.length === 0) {
    return <Spin size="large" className="flex justify-center mt-20" />;
  }

  const summaryRail = (
    <div>
      <div
        className="panel"
        style={{
          padding: "20px 22px",
          marginBottom: 14,
          background:
            "linear-gradient(150deg, color-mix(in oklab, var(--accent) 14%, var(--panel)), var(--panel))",
        }}
      >
        <div className="stat-label" style={{ marginBottom: 0 }}>
          Total portfolio value
        </div>
        <div
          style={{
            fontSize: isMobile ? 28 : 32,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            fontVariantNumeric: "tabular-nums",
            margin: "3px 0 14px",
          }}
        >
          {totals.fxOk ? "" : "≈ "}RM {fmt(totals.value)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <GLPill value={totals.gain} pct={totals.gainPct} />
          <span
            style={{
              color: totals.gain < 0 ? "var(--neg)" : "var(--pos)",
              fontWeight: 600,
              fontSize: 14,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {totals.gain >= 0 ? "+" : "−"}RM {fmt(Math.abs(totals.gain))}
          </span>
          <span style={{ color: "var(--t3)", fontSize: 12.5 }}>all time</span>
        </div>
      </div>

      {enriched.length > 0 && (
        <div className="panel" style={{ padding: "18px 20px", marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--t2)" }}>
              Allocation
            </span>
            <span style={{ fontSize: 12, color: "var(--t3)" }}>
              {enriched.length} holdings
            </span>
          </div>
          <div style={{ display: "grid", placeItems: "center", marginBottom: 16 }}>
            <Donut size={146} thick={18} data={enriched}>
              <div>
                <div style={{ color: "var(--t3)", fontSize: 10.5 }}>Invested</div>
                <div
                  style={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: "tabular-nums" }}
                >
                  RM {fmt0(totals.cost)}
                </div>
              </div>
            </Donut>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {enriched.map((h) => (
              <div
                key={h.raw.id}
                style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5 }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: h.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "var(--t2)", flex: 1 }}>{h.raw.symbol}</span>
                <span
                  style={{
                    color: "var(--t1)",
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {h.weight.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {enriched.length > 0 && (
        <div className="panel" style={{ padding: "18px 20px" }}>
          {[
            {
              label: "Invested cost",
              val: `RM ${fmt0(totals.cost)}`,
              icon: <AppstoreOutlined />,
              color: "var(--t2)",
            },
            best && {
              label: "Best performer",
              val: `${best.raw.symbol} · ${best.gainPct >= 0 ? "+" : "−"}${Math.abs(
                best.gainPct,
              ).toFixed(1)}%`,
              icon: <RiseOutlined />,
              color: "var(--pos)",
            },
            worst && {
              label: "Worst performer",
              val: `${worst.raw.symbol} · ${worst.gainPct >= 0 ? "+" : "−"}${Math.abs(
                worst.gainPct,
              ).toFixed(1)}%`,
              icon: <FallOutlined />,
              color: "var(--neg)",
            },
          ]
            .filter(Boolean)
            .map((r, i, arr) => (
              <div
                key={(r as any).label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: i < arr.length - 1 ? 13 : 0,
                  marginBottom: i < arr.length - 1 ? 13 : 0,
                  borderBottom: i < arr.length - 1 ? "1px solid var(--line-soft)" : "none",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "var(--t2)",
                    fontSize: 13.5,
                  }}
                >
                  <span style={{ color: (r as any).color, display: "inline-flex" }}>
                    {(r as any).icon}
                  </span>
                  {(r as any).label}
                </span>
                <span
                  style={{
                    color: "var(--t1)",
                    fontWeight: 600,
                    fontSize: 14,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {(r as any).val}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  const HoldingCard = isMobile ? HoldingCardMobile : HoldingCardDesktop;

  return (
    <div>
      <div className="titlebar">
        <h1 className="h1" style={{ fontSize: isMobile ? 22 : 26 }}>
          Investments
        </h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="icon-btn"
            onClick={refreshPrices}
            disabled={refreshing}
            title="Refresh prices"
          >
            <ReloadOutlined spin={refreshing} />
          </button>
          <button
            className="btn-primary-emerald"
            onClick={() =>
              isMobile ? navigate("/investments/new") : setHModalOpen(true)
            }
          >
            <PlusOutlined />
            {isMobile ? "Add" : "Add Holding"}
          </button>
        </div>
      </div>

      {enriched.length === 0 ? (
        <div className="panel" style={{ padding: 40 }}>
          <Empty description="No investments yet — add your first holding" />
        </div>
      ) : isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {summaryRail}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 2,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)" }}>
              Holdings
            </span>
            <span style={{ fontSize: 11.5, color: "var(--t3)" }}>
              {enriched.length} positions
            </span>
          </div>
          {enriched.map((h) => (
            <HoldingCard
              key={h.raw.id}
              h={h}
              onDelete={() => deleteHolding(h.raw)}
              onSavePrice={
                !isAutoPriceable(h.raw.currency)
                  ? (raw) => savePrice(h.raw, raw)
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
          {summaryRail}
          <div>
            {enriched.map((h) => (
              <HoldingCard
                key={h.raw.id}
                h={h}
                onDelete={() => deleteHolding(h.raw)}
                onSavePrice={
                  !isAutoPriceable(h.raw.currency)
                    ? (raw) => savePrice(h.raw, raw)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      <AddHoldingModal
        open={hModalOpen}
        onClose={closeAddHolding}
        onSubmit={addHolding}
      />
    </div>
  );
}
