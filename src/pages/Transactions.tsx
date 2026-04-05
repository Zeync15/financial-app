import { useEffect, useState, useMemo } from "react";
import { Button, Input, Spin, Typography, message } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import CashFlowHeader from "@/components/transactions/CashFlowHeader";
import TransactionTimeline from "@/components/transactions/TransactionTimeline";
import AddTransactionForm, {
  type EditableTransaction,
} from "@/components/transactions/AddTransactionForm";

const { Title } = Typography;

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

export default function Transactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<EditableTransaction | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api
      .get<Transaction[]>("/transactions")
      .then(setTxns)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const handleAdded = () => load();
    window.addEventListener("transaction-added", handleAdded);
    return () => window.removeEventListener("transaction-added", handleAdded);
  }, []);

  const handleEdit = (tx: Transaction) => {
    if (isMobile) {
      // Navigate to the form page — back gesture closes it naturally
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

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTx(null);
  };

  const netFlow = useMemo(
    () =>
      txns.reduce((sum, tx) => {
        const amount = Number(tx.amount);
        if (tx.type === "income") return sum + amount;
        if (tx.type === "expense") return sum - amount;
        return sum;
      }, 0),
    [txns],
  );

  const filteredTxns = useMemo(() => {
    if (!searchQuery.trim()) return txns;
    const q = searchQuery.toLowerCase();
    return txns.filter(
      (tx) =>
        tx.description?.toLowerCase().includes(q) ||
        tx.categoryName?.toLowerCase().includes(q) ||
        tx.accountName?.toLowerCase().includes(q),
    );
  }, [txns, searchQuery]);

  if (loading) {
    return <Spin size="large" className="flex justify-center mt-20" />;
  }

  return (
    <div>
      {/* Desktop header with Add button */}
      {!isMobile && (
        <div className="flex justify-between items-center mb-4">
          <Title level={3} className="mb-0!">
            Transactions
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingTx(null);
              setFormOpen(true);
            }}
          >
            Add Transaction
          </Button>
        </div>
      )}

      <CashFlowHeader
        netFlow={netFlow}
        searchOpen={searchOpen}
        onSearchToggle={() => {
          setSearchOpen((v) => !v);
          if (searchOpen) setSearchQuery("");
        }}
      />

      {searchOpen && (
        <div className="px-4 pb-2">
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

      <TransactionTimeline transactions={filteredTxns} onEdit={handleEdit} />

      {/* Desktop-only modal for add/edit */}
      {!isMobile && (
        <AddTransactionForm
          open={formOpen}
          onClose={handleFormClose}
          onSuccess={load}
          transaction={editingTx}
        />
      )}
    </div>
  );
}
