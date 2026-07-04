import { useEffect, useRef, useState } from "react";
import { Modal as AntdModal, Drawer as AntdDrawer, App as AntdApp } from "antd";
import { PlusOutlined, EditOutlined, DownOutlined } from "@ant-design/icons";
import { useIsMobile } from "@/hooks/useIsMobile";

type IconKey = "plus" | "pencil";

const ICONS: Record<IconKey, React.ReactNode> = {
  plus: <PlusOutlined />,
  pencil: <EditOutlined />,
};

export function Modal({
  open,
  onClose,
  title,
  icon = "plus",
  width = 560,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  // Either a built-in key or any React node (e.g. an inline SVG icon).
  icon?: IconKey | React.ReactNode;
  width?: number;
  children: React.ReactNode;
}) {
  const iconNode =
    typeof icon === "string" ? ICONS[icon as IconKey] ?? ICONS.plus : icon;
  const isMobile = useIsMobile();

  const header = (
    <div className="fm-head">
      <span className="fm-head-ic">{iconNode}</span>
      {title}
    </div>
  );

  if (isMobile) {
    return (
      <AntdDrawer
        open={open}
        onClose={onClose}
        placement="bottom"
        height="auto"
        className="fm-drawer"
        closable={false}
      >
        <div className="sheet-grip" />
        {header}
        {children}
      </AntdDrawer>
    );
  }

  return (
    <AntdModal
      open={open}
      onCancel={onClose}
      footer={null}
      width={width}
      destroyOnClose
      closeIcon={<span style={{ fontSize: 16 }}>×</span>}
      className="fm-modal"
      styles={{ body: { padding: 0 } }}
    >
      {header}
      {children}
    </AntdModal>
  );
}

export function FormBody({ children }: { children: React.ReactNode }) {
  return <div className="fm-body">{children}</div>;
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="fm-row">{children}</div>;
}

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <div className="field-lbl">
        {label}
        {required && <span className="req">*</span>}
      </div>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  inputRef,
  autoFocus,
  inputMode,
  maxDecimals,
}: {
  value?: string | number;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  autoFocus?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  // When set, restrict input to a number with at most this many decimal places
  // (0 = integers only) and default to a numeric on-screen keyboard.
  maxDecimals?: number;
}) {
  const numeric = maxDecimals != null;
  const resolvedMode =
    inputMode ?? (maxDecimals === 0 ? "numeric" : numeric ? "decimal" : undefined);
  return (
    <span className="fld">
      <input
        ref={inputRef}
        className="fld-input"
        type={type}
        inputMode={resolvedMode}
        value={value ?? ""}
        onChange={(e) =>
          onChange?.(numeric ? clampDecimals(e.target.value, maxDecimals) : e.target.value)
        }
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </span>
  );
}

// Keep only digits and a single decimal point, capping decimal places at `max`.
// max <= 0 strips the decimal point entirely (integers only).
function clampDecimals(raw: string, max: number): string {
  if (max <= 0) return raw.replace(/[^0-9]/g, "");
  const s = raw.replace(/[^0-9.]/g, "");
  const dot = s.indexOf(".");
  if (dot === -1) return s;
  const intPart = s.slice(0, dot);
  const decPart = s.slice(dot + 1).replace(/\./g, "").slice(0, max);
  return `${intPart}.${decPart}`;
}

export function AmountInput({
  value,
  onChange,
  currency = "RM",
  placeholder = "0.00",
  maxDecimals,
}: {
  value?: string | number;
  onChange?: (v: string) => void;
  currency?: string;
  placeholder?: string;
  // When set, sanitize input to a number with at most this many decimal places.
  maxDecimals?: number;
}) {
  return (
    <span className="fld has-cur">
      <span className="fld-cur">{currency}</span>
      <input
        className="fld-input"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) =>
          onChange?.(
            maxDecimals != null
              ? clampDecimals(e.target.value, maxDecimals)
              : e.target.value,
          )
        }
        placeholder={placeholder}
      />
    </span>
  );
}

export function DateInput({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <span className="fld">
      <input
        className="fld-input"
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </span>
  );
}

export type SelectOption = { value: string; label: string };

export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value?: string;
  onChange?: (v: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
}) {
  const opts = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <span className="fld">
      <select
        className="fld-input fld-select"
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="fld-chev">
        <DownOutlined style={{ fontSize: 11 }} />
      </span>
    </span>
  );
}

/**
 * Reuses the same `.seg` segmented pill the rest of the app uses for tab
 * bars (Categories Expense/Income, Dashboard Accounts/Allocation, the
 * Transactions List/Insights). Full-width with equal columns.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="seg" style={{ display: "flex" }}>
      {options.map((o) => (
        <span
          key={o.value}
          className={o.value === value ? "on" : ""}
          onClick={() => onChange(o.value)}
          style={{ flex: 1, textAlign: "center" }}
        >
          {o.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Reusable delete confirmation. Opens a themed modal (not a Popconfirm
 * tooltip). Returns a function you call with the delete action.
 */
export function useConfirmDelete() {
  const { modal } = AntdApp.useApp();
  return (
    onConfirm: () => void | Promise<void>,
    opts?: { title?: string; content?: string; okText?: string },
  ) =>
    modal.confirm({
      title: opts?.title ?? "Delete this item?",
      content: opts?.content ?? "This action cannot be undone.",
      okText: opts?.okText ?? "Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      centered: true,
      onOk: onConfirm,
    });
}

export function FormFooter({
  primary,
  onPrimary,
  onCancel,
  loading,
  danger,
  onDanger,
}: {
  primary: string;
  onPrimary: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: string;
  onDanger?: () => void;
}) {
  const confirmDelete = useConfirmDelete();
  return (
    <div className="fm-foot">
      {danger && onDanger && (
        <button
          type="button"
          className="btn-pill btn-danger"
          onClick={() =>
            confirmDelete(onDanger, {
              title: `${danger}?`,
              content: "This action cannot be undone.",
              okText: danger,
            })
          }
          disabled={loading}
        >
          {danger}
        </button>
      )}
      <div className="fm-foot-right">
        <button
          type="button"
          className="btn-pill btn-ghost"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn-pill btn-primary"
          onClick={onPrimary}
          disabled={loading}
        >
          {loading ? "…" : primary}
        </button>
      </div>
    </div>
  );
}

/**
 * Hook: focus first input when modal opens. Pass into the wrapper element
 * containing the fields.
 */
export function useAutoFocusFirstField(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLInputElement | HTMLSelectElement>(
        "input, select",
      );
      el?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);
  return ref;
}

/** Convenience: controlled input state with reset on open. */
export function useFormState<T extends object>(
  open: boolean,
  initial: T,
) {
  const [state, setState] = useState<T>(initial);
  useEffect(() => {
    if (open) setState(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const set = <K extends keyof T>(k: K, v: T[K]) =>
    setState((s) => ({ ...s, [k]: v }));
  return { state, set, setState };
}
