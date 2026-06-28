import { useEffect, useMemo, useRef, useState } from "react";
import { Button, DatePicker, Input, Spin, Empty, message } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  WalletOutlined,
  RiseOutlined,
  FallOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
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
  const [mobileMonth, setMobileMonth] = useState(() => dayjs().startOf("month"));
  const [insightRange, setInsightRange] = useState<
    [dayjs.Dayjs, dayjs.Dayjs] | null
  >(() => [dayjs().startOf("month"), dayjs().endOf("month")]);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: editParamId } = useParams<{ id: string }>();
  // `/transactions/new` and `/transactions/:id/edit` route here too; we open
  // the form drawer/modal in response to the URL and navigate back on close.
  const wantsNew = location.pathname.endsWith("/transactions/new");
  const wantsEdit = !!editParamId;

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
    // On mobile List tab, filter by selected month.
    if (isMobile && mobileTab === "list") {
      const start = mobileMonth.format("YYYY-MM-DD");
      const end = mobileMonth.endOf("month").format("YYYY-MM-DD");
      out = out.filter((t) => t.date >= start && t.date <= end);
    }
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
  }, [
    txns,
    searchQuery,
    direction,
    categoryFilter,
    isMobile,
    mobileTab,
    mobileMonth,
  ]);

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
      setMobileMonth((m) =>
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
        return { date, label: dayLabel(date), total, items };
      })
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [filteredTxns]);

  // Insights tab filters all transactions by the date range picker.
  // Mobile mirrors the List-tab month when no range is set yet.
  const insightTxns = useMemo(() => {
    if (!insightRange) return txns;
    const [s, e] = insightRange;
    const start = s.format("YYYY-MM-DD");
    const end = e.format("YYYY-MM-DD");
    return txns.filter((t) => t.date >= start && t.date <= end);
  }, [txns, insightRange]);

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

  // Monthly net for the mobile List hero (uses the selected mobile month).
  const mobileMonthNet = useMemo(() => {
    const start = mobileMonth.format("YYYY-MM-DD");
    const end = mobileMonth.endOf("month").format("YYYY-MM-DD");
    let income = 0;
    let expense = 0;
    for (const tx of txns) {
      if (tx.date < start || tx.date > end) continue;
      const a = Number(tx.amount);
      if (tx.type === "income") income += a;
      else if (tx.type === "expense") expense += a;
    }
    return income - expense;
  }, [txns, mobileMonth]);

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
    return [...map.entries()]
      .map(([label, { val, color }]) => ({
        label,
        val,
        color,
        pct: Math.round((val / total) * 100),
      }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 6);
  }, [txns]);

  if (loading) {
    return <Spin size="large" className="flex justify-center mt-20" />;
  }

  const rangeBar = isMobile && mobileTab === "insights" ? (
    <div style={{ marginBottom: 12 }}>
      <DatePicker.RangePicker
        value={insightRange}
        onChange={(v) =>
          setInsightRange(
            v && v[0] && v[1] ? [v[0], v[1]] : null,
          )
        }
        style={{ width: "100%" }}
        allowClear
      />
    </div>
  ) : null;

  const summaryRail = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!isMobile && (
        <div style={{ marginBottom: 2 }}>
          <DatePicker.RangePicker
            value={insightRange}
            onChange={(v) =>
              setInsightRange(
                v && v[0] && v[1] ? [v[0], v[1]] : null,
              )
            }
            style={{ width: "100%" }}
            allowClear
          />
        </div>
      )}
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

      {spendByCategory.length > 0 && (
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
          {spendByCategory.map((d) => {
            const max = spendByCategory[0].val || 1;
            return (
              <div className="bar-row" key={d.label}>
                <div className="bar-top">
                  <span
                    style={{ display: "flex", alignItems: "baseline", gap: 8 }}
                  >
                    <span style={{ color: "var(--t2)" }}>{d.label}</span>
                    <span
                      style={{
                        color: "var(--t3)",
                        fontSize: 12,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {d.pct}%
                    </span>
                  </span>
                  <span
                    style={{
                      color: "var(--t1)",
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    RM {fmt(d.val)}
                  </span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(d.val / max) * 100}%`,
                      background: d.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
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
              <span className="d">{day.label}</span>
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

      {/* Mobile month label (swipe the list left/right to change) + net hero */}
      {isMobile && mobileTab === "list" && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--t1)",
                letterSpacing: "-0.01em",
                textAlign: "center",
              }}
            >
              {mobileMonth.format("MMMM YYYY")}
            </span>
          </div>
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
            <div
              style={{
                color: mobileMonthNet >= 0 ? "var(--pos)" : "var(--neg)",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {mobileMonthNet >= 0 ? "+" : "−"}RM {fmt(Math.abs(mobileMonthNet))}
            </div>
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background:
                  mobileMonthNet >= 0
                    ? "color-mix(in oklab, var(--pos) 20%, transparent)"
                    : "color-mix(in oklab, var(--neg) 20%, transparent)",
                color: mobileMonthNet >= 0 ? "var(--pos)" : "var(--neg)",
                fontSize: 20,
              }}
            >
              {mobileMonthNet >= 0 ? <RiseOutlined /> : <FallOutlined />}
            </span>
          </div>
        </>
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
          <span className="chip-select">
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

      {rangeBar}

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
