import { useEffect, useMemo, useState } from "react";
import { Button, Popconfirm, message, Spin, Empty } from "antd";
import {
  Modal,
  FormBody,
  Field,
  TextInput,
  SelectInput,
  FormFooter,
} from "@/components/forms/FormKit";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getCategoryIcon, DEFAULT_CATEGORY_COLOR } from "@/lib/categoryIcons";
import IconCircle from "@/components/common/IconCircle";

interface Category {
  id: string;
  userId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  type: string;
}

interface SortableTileProps {
  cat: Category;
  isMobile: boolean;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
}

function SortableTile({
  cat,
  isMobile,
  onEdit,
  onDelete,
}: SortableTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 2 : undefined,
    boxShadow: isDragging ? "0 12px 28px rgba(0,0,0,0.45)" : undefined,
    position: "relative",
  };

  const color = cat.color || DEFAULT_CATEGORY_COLOR;
  const icon = getCategoryIcon(cat.name, cat.icon);
  const isUserOwned = !!cat.userId;

  const grip = (
    <span
      className="cat-grip"
      title="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <HolderOutlined />
    </span>
  );

  const actions = (
    <div
      style={{ display: "flex", gap: 6 }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        className="cat-icon-btn"
        title={isUserOwned ? "Edit" : "Default category — cannot edit"}
        disabled={!isUserOwned}
        onClick={() => isUserOwned && onEdit(cat)}
      >
        <EditOutlined />
      </button>
      {isUserOwned ? (
        <Popconfirm
          title="Delete this category?"
          onConfirm={() => onDelete(cat.id)}
          placement="left"
        >
          <button className="cat-icon-btn danger" title="Delete">
            <DeleteOutlined />
          </button>
        </Popconfirm>
      ) : (
        <button
          className="cat-icon-btn danger"
          title="Default category — cannot delete"
          disabled
        >
          <DeleteOutlined />
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div ref={setNodeRef} className="tx-row" style={style}>
        {grip}
        <IconCircle icon={icon} color={color} size={36} />
        <div className="meta">
          <div className="lbl">{cat.name}</div>
        </div>
        {actions}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className="panel"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        ...style,
      }}
    >
      {grip}
      <IconCircle icon={icon} color={color} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--t1)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cat.name}
        </div>
      </div>
      {actions}
    </div>
  );
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    type: "expense" as "expense" | "income",
    color: "#1677ff",
    icon: "",
  });
  const isMobile = useIsMobile();

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

  const filtered = useMemo(
    () => categories.filter((c) => c.type === activeTab),
    [categories, activeTab],
  );

  // DnD sensors — small activation distance so the drag only kicks in
  // after the pointer actually moves a bit (lets normal taps through).
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = filtered.findIndex((c) => c.id === active.id);
    const newIdx = filtered.findIndex((c) => c.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const newOrder = arrayMove(filtered, oldIdx, newIdx);
    setCategories((prev) => {
      const others = prev.filter((c) => c.type !== activeTab);
      return [...others, ...newOrder];
    });
    const order = newOrder.map((c, i) => ({ id: c.id, sortOrder: i }));
    try {
      await api.put("/categories/reorder", { order });
    } catch (err: any) {
      message.error(err?.message ?? "Reorder failed");
      load();
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormState({ name: "", type: activeTab, color: "#1677ff", icon: "" });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setFormState({
      name: cat.name,
      type: cat.type as "expense" | "income",
      color: cat.color || "#1677ff",
      icon: cat.icon ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formState.name.trim()) {
      message.error("Name is required");
      return;
    }
    try {
      const payload = {
        name: formState.name,
        type: formState.type,
        color: formState.color,
        icon: formState.icon || null,
      };
      if (editing) {
        await api.put(`/categories/${editing.id}`, payload);
        message.success("Category updated");
      } else {
        await api.post("/categories", payload);
        message.success("Category created");
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const setField = <K extends keyof typeof formState>(
    k: K,
    v: (typeof formState)[K],
  ) => setFormState((s) => ({ ...s, [k]: v }));

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
      <div className="titlebar">
        <h1 className="h1" style={{ fontSize: isMobile ? 22 : 26 }}>
          Categories
        </h1>
        <button className="btn-primary-emerald" onClick={openCreate}>
          <PlusOutlined />
          {isMobile ? "Add" : "Add Category"}
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="seg" style={isMobile ? { display: "flex" } : undefined}>
          <span
            className={activeTab === "expense" ? "on" : ""}
            onClick={() => setActiveTab("expense")}
            style={isMobile ? { flex: 1, textAlign: "center" } : undefined}
          >
            Expense
          </span>
          <span
            className={activeTab === "income" ? "on" : ""}
            onClick={() => setActiveTab("income")}
            style={isMobile ? { flex: 1, textAlign: "center" } : undefined}
          >
            Income
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty
          description={`No ${activeTab} categories yet`}
          className="mt-10"
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filtered.map((c) => c.id)}
            strategy={
              isMobile ? verticalListSortingStrategy : rectSortingStrategy
            }
          >
            {isMobile ? (
              <div className="panel" style={{ overflow: "hidden" }}>
                {filtered.map((cat) => (
                  <SortableTile
                    key={cat.id}
                    cat={cat}
                    isMobile
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                }}
              >
                {filtered.map((cat) => (
                  <SortableTile
                    key={cat.id}
                    cat={cat}
                    isMobile={false}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
      )}

      {isMobile && (
        <div style={{ paddingTop: 16 }}>
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Category" : "New Category"}
        icon={editing ? "pencil" : "plus"}
      >
        <FormBody>
          <Field label="Name" required>
            <TextInput
              value={formState.name}
              onChange={(v) => setField("name", v)}
              placeholder="e.g. Groceries"
              autoFocus
            />
          </Field>
          <Field label="Type" required>
            <SelectInput
              value={formState.type}
              onChange={(v) => setField("type", v as "expense" | "income")}
              options={[
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
              ]}
            />
          </Field>
          <Field label="Color">
            <TextInput
              value={formState.color}
              onChange={(v) => setField("color", v)}
              placeholder="#1677ff"
            />
          </Field>
          <Field label="Icon (optional)">
            <TextInput
              value={formState.icon}
              onChange={(v) => setField("icon", v)}
              placeholder="e.g. food, shopping, salary"
            />
          </Field>
        </FormBody>
        <FormFooter
          primary={editing ? "Save Changes" : "Add Category"}
          onPrimary={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
