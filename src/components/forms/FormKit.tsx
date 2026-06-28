import { useEffect, useRef, useState } from "react";
import { Modal as AntdModal, Drawer as AntdDrawer } from "antd";
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
}: {
  value?: string | number;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  autoFocus?: boolean;
}) {
  return (
    <span className="fld">
      <input
        ref={inputRef}
        className="fld-input"
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </span>
  );
}

export function AmountInput({
  value,
  onChange,
  currency = "RM",
  placeholder = "0.00",
}: {
  value?: string | number;
  onChange?: (v: string) => void;
  currency?: string;
  placeholder?: string;
}) {
  return (
    <span className="fld has-cur">
      <span className="fld-cur">{currency}</span>
      <input
        className="fld-input"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
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
  return (
    <div className="fm-foot">
      {danger && onDanger && (
        <button
          type="button"
          className="btn-pill btn-danger"
          onClick={onDanger}
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
