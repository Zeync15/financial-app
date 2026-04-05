import { theme } from "antd";
import { WalletOutlined, EditOutlined } from "@ant-design/icons";
import { getCategoryIcon, DEFAULT_CATEGORY_COLOR } from "@/lib/categoryIcons";
import IconCircle from "@/components/common/IconCircle";

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

interface TransactionRowProps {
  transaction: Transaction;
  currency?: string;
  onEdit: (tx: Transaction) => void;
}

export default function TransactionRow({
  transaction: tx,
  currency = "MYR",
  onEdit,
}: TransactionRowProps) {
  const { token } = useToken();

  const color = tx.categoryColor || DEFAULT_CATEGORY_COLOR;
  const icon = getCategoryIcon(tx.categoryName);
  const amount = Number(tx.amount);

  const amountColor =
    tx.type === "income"
      ? token.colorSuccess
      : tx.type === "expense"
        ? token.colorError
        : token.colorPrimary;

  const amountPrefix = tx.type === "income" ? "+" : "-";
  const formattedAmount = `${amountPrefix}${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const categoryLabel =
    tx.categoryName || tx.type.charAt(0).toUpperCase() + tx.type.slice(1);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(tx)}
      onKeyDown={(e) => e.key === "Enter" && onEdit(tx)}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer active:opacity-60"
      style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}
    >
      <IconCircle icon={icon} color={color} />

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <div
          className="font-medium text-sm truncate"
          style={{ color: token.colorText }}
        >
          {categoryLabel}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <WalletOutlined style={{ fontSize: 10, color: token.colorTextTertiary }} />
          <span className="text-xs truncate" style={{ color: token.colorTextTertiary }}>
            {tx.accountName || "Account"}
          </span>
        </div>
        {tx.description && (
          <div className="flex items-center gap-1 mt-0.5">
            <EditOutlined style={{ fontSize: 10, color: token.colorTextQuaternary }} />
            <span className="text-xs truncate" style={{ color: token.colorTextQuaternary }}>
              {tx.description}
            </span>
          </div>
        )}
      </div>

      {/* Amount */}
      <div
        className="shrink-0 font-semibold text-sm text-right"
        style={{ color: amountColor }}
      >
        {formattedAmount}
      </div>
    </div>
  );
}
