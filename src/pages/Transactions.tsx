import { useEffect, useMemo, useRef, useState } from "react";
import { Button, DatePicker, Input, Spin, Empty, message } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  WalletOutlined,
  RiseOutlined,
  FallOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useFabAction } from "@/hooks/useFabAction";
import IconCircle from "@/components/common/IconCircle";
import { getCategoryIcon, DEFAULT_CATEGORY_COLOR } from "@/lib/categoryIcons";
import AddTransactionForm, {
  type EditableTransaction,
} from "@/components/transactions/AddTransactionForm";

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
  transferToId?: string | null;
}

interface CategoryLite {
  id: string;
  name: string;
}

type Direction = "all" | "in" | "out";

function fmt(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dayLabel(date: string) {
  const today = dayjs().format("YYYY-MM-DD");
  const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
  if (date === today) return "Today";
  if (date === yesterday) return "Yesterday";
  return dayjs(date).format("MMMM D");
}

// Dependency-free donut chart (same technique as the Dashboard allocation
// donut): each slice is a stroked circle arc via strokeDasharray.
function Donut({
  data,
  size = 168,
  thick = 22,
}: {
  data: { color: string; pct: number }[];
  size?: number;
  thick?: number;
}) {
  const r = (size - thick) / 2;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
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
        const len = (d.pct / 100) * c;
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
  );
}

function TxRow({
  tx,
  onClick,
}: {
  tx: Transaction;
  onClick: () => void;
}) {
  const color = tx.categoryColor || DEFAULT_CATEGORY_COLOR;
  const icon = getCategoryIcon(tx.categoryName);
  const amount = Number(tx.amount);
  const isIncome = tx.type === "income";
  const isExpense = tx.type === "expense";
  const sign = isIncome ? "+" : isExpense ? "−" : "";
  const amtColor = isIncome
    ? "var(--pos)"
    : isExpense
      ? "var(--neg)"
      : "var(--t2)";
  const categoryLabel =
    tx.categoryName ?? tx.type.charAt(0).toUpperCase() + tx.type.slice(1);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="tx-row cursor-pointer"
    >
      <IconCircle icon={icon} color={color} size={38} />
      <div className="meta">
        <div className="lbl">{tx.description || categoryLabel}</div>
        <div className="sub">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <WalletOutlined style={{ fontSize: 11 }} />
            {tx.accountName ?? "Account"}
          </span>
          {tx.categoryName && (
            <>
              <span className="dot" />
              <span>{tx.categoryName}</span>
            </>
          )}
        </div>
      </div>
      <div className="amt" style={{ color: amtColor }}>
        {sign}RM {fmt(amount)}
      </div>
    </div>
  );
}

export default function Transactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [direction, setDirection] = useState<Direction>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<EditableTransaction | null>(null);
  const [mobileTab, setMobileTab] = useState<"list" | "insights">("list");
  // One month drives both List and Insights (mobile + desktop).
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().startOf("month"));
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: editParamId } = useParams<{ id: string }>();
  // `/transactions/new` and `/transactions/:id/edit` route here too; we open
  // the form drawer/modal in response to the URL and navigate back on close.
  const wantsNew = location.pathname.endsWith("/transactions/new");
  const wantsEdit = !!editParamId;

  // FAB opens the add form: full-screen route on mobile, drawer on desktop.
  useFabAction(() => {
    if (isMobile) {
      navigate("/transactions/new");
    } else {
      setEditingTx(null);
      setFormOpen(true);
    }
  });

  const load = () => {
    setLoading(true);
    api
      .get<Transaction[]>("/transactions")
      .then(setTxns)
      .catch((e) => message.error(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get<CategoryLite[]>("/categories").then(setCategories).catch(() => {});
    const handleAdded = () => load();
    window.addEventListener("transaction-added", handleAdded);
    return () => window.removeEventListener("transaction-added", handleAdded);
  }, []);

  // React to URL → open the right form. Runs on every navigation; the
  // form's own state machine handles loading data.
  useEffect(() => {
    if (wantsNew) {
      setEditingTx(null);
      setFormOpen(true);
      return;
    }
    if (wantsEdit) {
      const fromState = (location.state as { transaction?: EditableTransaction } | null)
        ?.transaction;
      if (fromState) {
        setEditingTx(fromState);
        setFormOpen(true);
        return;
      }
      // Deep-link / reload: state was lost, look the row up from the list
      // once it loads.
      const found = txns.find((t) => t.id === editParamId);
      if (found) {
        setEditingTx({
          id: found.id,
          accountId: found.accountId,
          type: found.type,
          amount: found.amount,
          description: found.description,
          date: found.date,
          categoryId: found.categoryId,
          transferToId: found.transferToId,
        });
        setFormOpen(true);
      }
      return;
    }
    setFormOpen(false);
    setEditingTx(null);
  }, [wantsNew, wantsEdit, editParamId, location.state, txns]);

  const closeForm = () => {
    setFormOpen(false);
    setEditingTx(null);
    if (wantsNew || wantsEdit) navigate("/transactions", { replace: true });
  };

  const handleEdit = (tx: Transaction) => {
    if (isMobile) {
      navigate(`/transactions/${tx.id}/edit`, {
        state: {
          transaction: {
            id: tx.id,
            accountId: tx.accountId,
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            date: tx.date,
            categoryId: tx.categoryId,
            transferToId: tx.transferToId,
          } satisfies EditableTransaction,
        },
      });
    } else {
      setEditingTx({
        id: tx.id,
        accountId: tx.accountId,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        date: tx.date,
        categoryId: tx.categoryId,
        transferToId: tx.transferToId,
      });
      setFormOpen(true);
    }
  };

  const filteredTxns = useMemo(() => {
    let out = txns;
    // Scope to the shared selected month.
    const start = selectedMonth.startOf("month").format("YYYY-MM-DD");
    const end = selectedMonth.endOf("month").format("YYYY-MM-DD");
    out = out.filter((t) => t.date >= start && t.date <= end);
    if (direction === "in") out = out.filter((t) => t.type === "income");
    else if (direction === "out")
      out = out.filter((t) => t.type === "expense");
    if (categoryFilter !== "all") {
      out = out.filter((t) => t.categoryId === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      out = out.filter(
        (tx) =>
          tx.description?.toLowerCase().includes(q) ||
          tx.categoryName?.toLowerCase().includes(q) ||
          tx.accountName?.toLowerCase().includes(q),
      );
    }
    return out;
  }, [txns, searchQuery, direction, categoryFilter, selectedMonth]);

  // Horizontal swipe → change month on mobile List. touch-action: pan-y keeps
  // vertical scroll natural; we only react once the swipe is clearly horizontal.
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const swipeActive = useRef(false);
  const onSwipeStart = (x: number, y: number) => {
    swipeStartX.current = x;
    swipeStartY.current = y;
    swipeActive.current = false;
  };
  const onSwipeMove = (x: number, y: number) => {
    if (swipeStartX.current == null || swipeStartY.current == null) return;
    const dx = x - swipeStartX.current;
    const dy = y - swipeStartY.current;
    if (!swipeActive.current && Math.abs(dx) > Math.abs(dy) + 8) {
      swipeActive.current = true;
    }
  };
  const onSwipeEnd = (x: number) => {
    if (swipeStartX.current == null) return;
    const dx = x - swipeStartX.current;
    if (swipeActive.current && Math.abs(dx) > 60) {
      setSelectedMonth((m) =>
        dx > 0 ? m.subtract(1, "month") : m.add(1, "month"),
      );
    }
    swipeStartX.current = null;
    swipeStartY.current = null;
    swipeActive.current = false;
  };
  const swipeHandlers = isMobile
    ? {
        onTouchStart: (e: React.TouchEvent) => {
          const t = e.touches[0];
          if (t) onSwipeStart(t.clientX, t.clientY);
        },
        onTouchMove: (e: React.TouchEvent) => {
          const t = e.touches[0];
          if (t) onSwipeMove(t.clientX, t.clientY);
        },
        onTouchEnd: (e: React.TouchEvent) => {
          const t = e.changedTouches[0];
          if (t) onSwipeEnd(t.clientX);
        },
        style: { touchAction: "pan-y" as const },
      }
    : {};

  const dayGroups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of filteredTxns) {
      const existing = map.get(tx.date);
      if (existing) existing.push(tx);
      else map.set(tx.date, [tx]);
    }
    return [...map.entries()]
      .map(([date, items]) => {
        const total = items.reduce((sum, tx) => {
          const a = Number(tx.amount);
          if (tx.type === "income") return sum + a;
          if (tx.type === "expense") return sum - a;
          return sum;
        }, 0);
        return {
          date,
          label: dayLabel(date),
          weekday: dayjs(date).format("ddd"),
          total,
          items,
        };
      })
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [filteredTxns]);

  // Insights use the same selected month as the List.
  const insightTxns = useMemo(() => {
    const start = selectedMonth.startOf("month").format("YYYY-MM-DD");
    const end = selectedMonth.endOf("month").format("YYYY-MM-DD");
    return txns.filter((t) => t.date >= start && t.date <= end);
  }, [txns, selectedMonth]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of insightTxns) {
      const a = Number(tx.amount);
      if (tx.type === "income") income += a;
      else if (tx.type === "expense") expense += a;
    }
    return { income, expense, net: income - expense };
  }, [insightTxns]);

  // Mobile List hero — the month's net, or the selected category's net when
  // the category filter is narrowed. Ignores direction/search so the hero
  // always reads as "the balance of what this filter covers".
  const hero = useMemo(() => {
    if (categoryFilter === "all") {
      return { label: "Net flow", value: summary.net };
    }
    const name =
      categories.find((c) => c.id === categoryFilter)?.name ?? "Category";
    let value = 0;
    for (const tx of insightTxns) {
      if (tx.categoryId !== categoryFilter) continue;
      const a = Number(tx.amount);
      if (tx.type === "income") value += a;
      else if (tx.type === "expense") value -= a;
    }
    return { label: `${name} balance`, value };
  }, [categoryFilter, categories, insightTxns, summary.net]);

  const spendByCategory = useMemo(() => {
    const map = new Map<string, { val: number; color: string }>();
    for (const tx of insightTxns) {
      if (tx.type !== "expense") continue;
      const name = tx.categoryName ?? "Other";
      const color = tx.categoryColor ?? DEFAULT_CATEGORY_COLOR;
      const cur = map.get(name) ?? { val: 0, color };
      cur.val += Number(tx.amount);
      cur.color = color;
      map.set(name, cur);
    }
    const total = [...map.values()].reduce((s, v) => s + v.val, 0) || 1;
    // Every category that had spending gets its own slice — no "Other" roll-up.
    const ranked = [...map.entries()]
      .map(([label, { val, color }]) => ({ label, val, color }))
      .sort((a, b) => b.val - a.val);
    return {
      total,
      // `pct` stays unrounded so the arcs still sum to the full circle even
      // with many small slices; `pctLabel` is the display form.
      slices: ranked.map((d) => {
        const pct = (d.val / total) * 100;
        return {
          ...d,
          pct,
          pctLabel: pct >= 1 || pct === 0 ? `${Math.round(pct)}` : pct.toFixed(1),
        };
      }),
    };
  }, [insightTxns]);

  if (loading) {
    return <Spin size="large" className="flex justify-center mt-20" />;
  }

  const summaryRail = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="panel" style={{ padding: "18px 20px" }}>
        {[
          {
            label: "Income",
            val: summary.income,
            color: "var(--pos)",
            icon: <RiseOutlined />,
            sign: "+",
          },
          {
            label: "Expenses",
            val: summary.expense,
            color: "var(--neg)",
            icon: <FallOutlined />,
            sign: "−",
          },
        ].map((r) => (
          <div
            key={r.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                color: "var(--t2)",
                fontSize: 13.5,
              }}
            >
              <span style={{ color: r.color }}>{r.icon}</span>
              {r.label}
            </span>
            <span
              style={{
                color: r.color,
                fontWeight: 600,
                fontSize: 16,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {r.sign}RM {fmt(r.val)}
            </span>
          </div>
        ))}
        <div
          style={{
            paddingTop: 14,
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "var(--t2)", fontSize: 13.5 }}>Net flow</span>
          <span
            style={{
              color: summary.net >= 0 ? "var(--pos)" : "var(--neg)",
              fontWeight: 600,
              fontSize: 20,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {summary.net >= 0 ? "+" : "−"}RM {fmt(Math.abs(summary.net))}
          </span>
        </div>
      </div>

      {spendByCategory.slices.length > 0 && (
        <div className="panel" style={{ padding: "18px 20px" }}>
          <div
            style={{
              color: "var(--t1)",
              fontWeight: 600,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            Spending by category
          </div>
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <Donut data={spendByCategory.slices} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "var(--t3)", fontSize: 11.5 }}>Total</span>
              <span
                style={{
                  color: "var(--t1)",
                  fontWeight: 700,
                  fontSize: 16,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                RM {fmt(spendByCategory.total)}
              </span>
            </div>
          </div>
          {spendByCategory.slices.map((d) => (
            <div
              key={d.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: d.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: "var(--t2)",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {d.label}
                </span>
                <span
                  style={{
                    color: "var(--t3)",
                    fontSize: 12,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {d.pctLabel}%
                </span>
              </span>
              <span
                style={{
                  color: "var(--t1)",
                  fontWeight: 600,
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                RM {fmt(d.val)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const timeline = (
    <div className="panel" style={{ overflow: "hidden" }} {...swipeHandlers}>
      {dayGroups.length === 0 ? (
        <div style={{ padding: 40 }}>
          <Empty description="No transactions" />
        </div>
      ) : (
        dayGroups.map((day) => (
          <div key={day.date}>
            <div className="day-head">
              <span className="lbl">
                <span className="d">{day.label}</span>
                <span className="wd">{day.weekday}</span>
              </span>
              <span
                className="t"
                style={{
                  color:
                    day.total < 0
                      ? "var(--neg)"
                      : day.total > 0
                        ? "var(--pos)"
                        : "var(--t3)",
                }}
              >
                {day.total < 0 ? "−" : day.total > 0 ? "+" : ""}RM{" "}
                {fmt(Math.abs(day.total))}
              </span>
            </div>
            {day.items.map((tx) => (
              <TxRow key={tx.id} tx={tx} onClick={() => handleEdit(tx)} />
            ))}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div>
      <div className="titlebar">
        <h1 className="h1" style={{ fontSize: isMobile ? 22 : 26 }}>
          Transactions
        </h1>
        {!isMobile && (
          <button
            className="btn-primary-emerald"
            onClick={() => {
              setEditingTx(null);
              setFormOpen(true);
            }}
          >
            <PlusOutlined />
            Add Transaction
          </button>
        )}
        {isMobile && (
          <Button
            type="text"
            icon={<SearchOutlined />}
            size="large"
            onClick={() => setSearchOpen((v) => !v)}
          />
        )}
      </div>

      {/* Shared month picker — drives both List and Insights. */}
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: isMobile ? "center" : "flex-start",
        }}
      >
        <DatePicker
          picker="month"
          value={selectedMonth}
          onChange={(v) => v && setSelectedMonth(v.startOf("month"))}
          allowClear={false}
          format="MMMM YYYY"
          inputReadOnly
          style={{ width: isMobile ? "100%" : 220 }}
        />
      </div>

      {/* Mobile tabs — same .seg style as Categories / Dashboard. */}
      {isMobile && (
        <div style={{ marginBottom: 12 }}>
          <div className="seg" style={{ display: "flex" }}>
            {(["list", "insights"] as const).map((t) => (
              <span
                key={t}
                className={mobileTab === t ? "on" : ""}
                onClick={() => setMobileTab(t)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  textTransform: "capitalize",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mobile List net hero (swipe the list left/right to change month) */}
      {isMobile && mobileTab === "list" && (
        <div
          className="panel"
          style={{
            padding: "15px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "var(--t3)",
                fontSize: 12.5,
                marginBottom: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {hero.label}
            </div>
            <div
              style={{
                color: hero.value >= 0 ? "var(--pos)" : "var(--neg)",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {hero.value >= 0 ? "+" : "−"}RM {fmt(Math.abs(hero.value))}
            </div>
          </div>
          <span
            style={{
              flex: "0 0 auto",
              width: 42,
              height: 42,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background:
                hero.value >= 0
                  ? "color-mix(in oklab, var(--pos) 20%, transparent)"
                  : "color-mix(in oklab, var(--neg) 20%, transparent)",
              color: hero.value >= 0 ? "var(--pos)" : "var(--neg)",
              fontSize: 20,
            }}
          >
            {hero.value >= 0 ? <RiseOutlined /> : <FallOutlined />}
          </span>
        </div>
      )}

      {/* Filter bar — desktop always; mobile only on List tab */}
      {(!isMobile || mobileTab === "list") && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div className="seg">
            {(["all", "in", "out"] as const).map((k) => (
              <span
                key={k}
                className={direction === k ? "on" : ""}
                onClick={() => setDirection(k)}
                style={{ textTransform: "capitalize" }}
              >
                {k === "all" ? "All" : k === "in" ? "In" : "Out"}
              </span>
            ))}
          </div>
          {/* Native <select> — AntD Select focuses a hidden search input on
              tap, which triggers iOS zoom. The native picker uses the OS
              wheel, no zoom, and matches the chip aesthetic with our own
              skin. */}
          <span
            className={`chip-select${categoryFilter !== "all" ? " on" : ""}`}
          >
            <span className="chip-select-icon">
              <FilterOutlined />
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="chip-select-chev">▾</span>
          </span>
          {!isMobile && (
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              style={{ marginLeft: "auto", maxWidth: 280 }}
            />
          )}
        </div>
      )}

      {isMobile && searchOpen && (
        <div style={{ marginBottom: 12 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            autoFocus
          />
        </div>
      )}

      {isMobile ? (
        mobileTab === "list" ? (
          timeline
        ) : (
          summaryRail
        )
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          {summaryRail}
          {timeline}
        </div>
      )}

      {/* Mounted on both layouts — FormKit's Modal auto-switches to a
          bottom drawer on mobile. Mobile entries (FAB, row tap) navigate to
          /new or /:id/edit; the URL effect above opens the form. */}
      <AddTransactionForm
        open={formOpen}
        onClose={closeForm}
        onSuccess={load}
        transaction={editingTx}
      />
    </div>
  );
}
