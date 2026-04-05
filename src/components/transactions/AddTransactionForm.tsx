import { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Button,
  Popconfirm,
  message,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { api } from "@/lib/api";

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string | null;
}

export interface EditableTransaction {
  id: string;
  accountId: string;
  type: string;
  amount: string;
  description: string | null;
  date: string;
  categoryId: string | null;
  transferToId?: string | null;
}

interface AddTransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: EditableTransaction | null;
}

export default function AddTransactionForm({
  open,
  onClose,
  onSuccess,
  transaction,
}: AddTransactionFormProps) {
  const [form] = Form.useForm();
  const [txType, setTxType] = useState("expense");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!transaction;

  useEffect(() => {
    if (open) {
      Promise.all([
        api.get<Account[]>("/accounts"),
        api.get<Category[]>("/categories"),
      ]).then(([a, c]) => {
        setAccounts(a);
        setCategories(c);
      });

      if (transaction) {
        setTxType(transaction.type);
        form.setFieldsValue({
          type: transaction.type,
          accountId: transaction.accountId,
          amount: Number(transaction.amount),
          categoryId: transaction.categoryId,
          date: dayjs(transaction.date),
          description: transaction.description,
          transferToId: transaction.transferToId,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ type: "expense", date: dayjs() });
        setTxType("expense");
      }
    }
  }, [open, transaction, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        amount: String(values.amount),
        date: values.date.format("YYYY-MM-DD"),
      };
      if (isEditing) {
        await api.put(`/transactions/${transaction.id}`, payload);
        message.success("Transaction updated");
      } else {
        await api.post("/transactions", payload);
        message.success("Transaction added");
      }
      onClose();
      onSuccess();
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    try {
      await api.delete(`/transactions/${transaction.id}`);
      message.success("Deleted");
      onClose();
      onSuccess();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const filteredCategories = categories.filter(
    (c) => txType === "transfer" || c.type === txType,
  );

  return (
    <Modal
      title={isEditing ? "Edit Transaction" : "New Transaction"}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnClose
      footer={
        isEditing
          ? [
              <Popconfirm
                key="delete"
                title="Delete this transaction?"
                onConfirm={handleDelete}
                placement="top"
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>,
              <Button key="cancel" onClick={onClose}>
                Cancel
              </Button>,
              <Button
                key="save"
                type="primary"
                onClick={handleSubmit}
                loading={submitting}
              >
                Save Changes
              </Button>,
            ]
          : undefined
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ type: "expense", date: dayjs() }}
      >
        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
          <Select
            onChange={(v) => {
              setTxType(v);
              form.setFieldValue("categoryId", undefined);
            }}
            options={[
              { value: "income", label: "Income" },
              { value: "expense", label: "Expense" },
              { value: "transfer", label: "Transfer" },
            ]}
          />
        </Form.Item>
        <Form.Item name="accountId" label="Account" rules={[{ required: true }]}>
          <Select
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Select account"
          />
        </Form.Item>
        {txType === "transfer" && (
          <Form.Item name="transferToId" label="Transfer To" rules={[{ required: true }]}>
            <Select
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              placeholder="Select destination"
            />
          </Form.Item>
        )}
        <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
          <InputNumber className="w-full" precision={2} min={0.01} />
        </Form.Item>
        <Form.Item name="categoryId" label="Category">
          <Select
            allowClear
            placeholder="Select category"
            options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item name="date" label="Date" rules={[{ required: true }]}>
          <DatePicker className="w-full" />
        </Form.Item>
        <Form.Item name="description" label="Note">
          <Input placeholder="What was this for?" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
