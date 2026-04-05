import { useEffect, useState } from "react";
import {
  Segmented,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  message,
  Spin,
  Empty,
  theme,
  Typography,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getCategoryIcon, DEFAULT_CATEGORY_COLOR } from "@/lib/categoryIcons";
import IconCircle from "@/components/common/IconCircle";

const { useToken } = theme;
const { Title } = Typography;

interface Category {
  id: string;
  userId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  type: string;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("expense");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form] = Form.useForm();
  const isMobile = useIsMobile();
  const { token } = useToken();

  const load = () => {
    setLoading(true);
    api
      .get<Category[]>("/categories")
      .then(setCategories)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = categories.filter((c) => c.type === activeTab);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: activeTab, color: "#1677ff" });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    form.setFieldsValue({
      name: cat.name,
      type: cat.type,
      color: cat.color || "#1677ff",
      icon: cat.icon,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, values);
        message.success("Category updated");
      } else {
        await api.post("/categories", values);
        message.success("Category created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`);
      message.success("Category deleted");
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  if (loading) {
    return <Spin size="large" className="flex justify-center mt-20" />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Title level={isMobile ? 4 : 3} className="mb-0!">
          Categories
        </Title>
        {!isMobile && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Category
          </Button>
        )}
      </div>

      <div className={isMobile ? "px-4 pt-2 pb-3" : "mb-4"}>
        <Segmented
          block
          value={activeTab}
          onChange={(v) => setActiveTab(v as string)}
          options={[
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <Empty
          description={`No ${activeTab} categories yet`}
          className="mt-10"
        />
      ) : (
        <div>
          {filtered.map((cat) => {
            const color = cat.color || DEFAULT_CATEGORY_COLOR;
            const icon = getCategoryIcon(cat.name, cat.icon);
            const isUserOwned = !!cat.userId;

            return (
              <div
                key={cat.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <IconCircle icon={icon} color={color} />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div
                    className="font-medium text-sm truncate"
                    style={{ color: token.colorText }}
                  >
                    {cat.name}
                  </div>
                  {!isUserOwned && (
                    <div
                      className="text-xs"
                      style={{ color: token.colorTextTertiary }}
                    >
                      Default
                    </div>
                  )}
                </div>

                {/* Actions (only for user-owned categories) */}
                {isUserOwned && (
                  <div className="shrink-0 flex gap-1">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(cat)}
                    />
                    <Popconfirm
                      title="Delete this category?"
                      onConfirm={() => handleDelete(cat.id)}
                      placement="left"
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile: floating add button */}
      {isMobile && (
        <div className="px-4 pt-4 pb-2">
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={openCreate}
          >
            Add Category
          </Button>
        </div>
      )}

      <Modal
        title={editing ? "Edit Category" : "New Category"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Groceries" />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
              ]}
            />
          </Form.Item>
          <Form.Item name="color" label="Color">
            <Input placeholder="#1677ff" />
          </Form.Item>
          <Form.Item name="icon" label="Icon (optional)">
            <Input placeholder="e.g. food, shopping, salary" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
