import { theme } from "antd";
import dayjs from "dayjs";
import TransactionRow from "./TransactionRow";

const { useToken } = theme;

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

interface TransactionGroup {
  date: string;
  displayDate: string;
  dailyTotal: number;
  transactions: Transaction[];
}

function groupByDate(txns: Transaction[]): TransactionGroup[] {
  const map = new Map<string, Transaction[]>();

  for (const tx of txns) {
    const existing = map.get(tx.date);
    if (existing) {
      existing.push(tx);
    } else {
      map.set(tx.date, [tx]);
    }
  }

  const today = dayjs().format("YYYY-MM-DD");
  const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

  const groups: TransactionGroup[] = [];

  for (const [date, transactions] of map) {
    let displayDate: string;
    if (date === today) displayDate = "Today";
    else if (date === yesterday) displayDate = "Yesterday";
    else displayDate = dayjs(date).format("MMMM D");

    const dailyTotal = transactions.reduce((sum, tx) => {
      const amount = Number(tx.amount);
      if (tx.type === "income") return sum + amount;
      if (tx.type === "expense") return sum - amount;
      return sum;
    }, 0);

    groups.push({ date, displayDate, dailyTotal, transactions });
  }

  groups.sort((a, b) => (a.date > b.date ? -1 : 1));
  return groups;
}

interface TransactionTimelineProps {
  transactions: Transaction[];
  currency?: string;
  onEdit: (tx: Transaction) => void;
}

export default function TransactionTimeline({
  transactions,
  currency = "MYR",
  onEdit,
}: TransactionTimelineProps) {
  const { token } = useToken();
  const groups = groupByDate(transactions);

  if (transactions.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-20"
        style={{ color: token.colorTextSecondary }}
      >
        No transactions yet
      </div>
    );
  }

  return (
    <div>
      {groups.map((group) => (
        <div key={group.date}>
          {/* Date header */}
          <div
            className="flex justify-between items-center px-4 py-2 sticky top-0 z-10"
            style={{
              backgroundColor: token.colorBgLayout,
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: token.colorTextSecondary }}
            >
              {group.displayDate}
            </span>
            <span
              className="text-xs font-medium"
              style={{
                color:
                  group.dailyTotal < 0
                    ? token.colorError
                    : group.dailyTotal > 0
                      ? token.colorSuccess
                      : token.colorTextSecondary,
              }}
            >
              {group.dailyTotal < 0 ? "-" : group.dailyTotal > 0 ? "+" : ""}
              {currency}{" "}
              {Math.abs(group.dailyTotal).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* Transaction rows */}
          {group.transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              currency={currency}
              onEdit={onEdit}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
