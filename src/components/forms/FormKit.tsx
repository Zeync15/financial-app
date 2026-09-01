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
  fullscreen = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  // Either a built-in key or any React node (e.g. an inline SVG icon).
  icon?: IconKey | React.ReactNode;
  width?: number;
  // Mobile: render as a full-screen page instead of a bottom sheet, so the form
  // grows downward from the top rather than upward from the bottom edge.
  fullscreen?: boolean;
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

  if (isMobile && fullscreen) {
    if (!open) return null;
    return (
      <div className="fm-full" role="dialog" aria-modal="true">
        <div className="fm-full-head">
          <span className="fm-head-ic">{iconNode}</span>
          {title}
        </div>
        {children}
      </div>
    );
  }

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

// Recursive-descent evaluator for amount fields that accept arithmetic. Handles
// + - * / and parentheses; returns null when the text isn't a complete, valid
// expression (mid-typing, stray operator, divide by zero).
export function evaluateAmount(raw: string): number | null {
  const s = raw.replace(/[ ,]/g, "").replace(/×/g, "*").replace(/÷/g, "/");
  if (!s) return null;
  let i = 0;

  const factor = (): number | null => {
    if (s[i] === "+" || s[i] === "-") {
      const sign = s[i++] === "-" ? -1 : 1;
      const v = factor();
      return v === null ? null : sign * v;
    }
    if (s[i] === "(") {
      i++;
      const v = expr();
      if (v === null || s[i] !== ")") return null;
      i++;
      return v;
    }
    const start = i;
    while (i < s.length && /[0-9.]/.test(s[i]!)) i++;
    if (i === start) return null;
    const n = Number(s.slice(start, i));
    return Number.isFinite(n) ? n : null;
  };

  const term = (): number | null => {
    let left = factor();
    while (left !== null && (s[i] === "*" || s[i] === "/")) {
      const op = s[i++];
      const right = factor();
      if (right === null || (op === "/" && right === 0)) return null;
      left = op === "*" ? left * right : left / right;
    }
    return left;
  };

  const expr = (): number | null => {
    let left = term();
    while (left !== null && (s[i] === "+" || s[i] === "-")) {
      const op = s[i++];
      const right = term();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  };

  const result = expr();
  if (result === null || i !== s.length || !Number.isFinite(result)) return null;
  return result;
}

// Money is DECIMAL(19,4) in the DB, so round there, then pad back up to the
// two decimals amounts are read in ("18.9" reads as unfinished money).
export function formatAmountResult(n: number): string {
  const r = Math.round(n * 1e4) / 1e4;
  const s = String(r);
  const dot = s.indexOf(".");
  return dot === -1 || s.length - dot - 1 < 2 ? r.toFixed(2) : s;
}

const HAS_OPERATOR = /[+*/()-]/;

// Canonical text -> what the field shows. The state stays "12.50+3.20*2"; only
// the display gets the spacing and the proper math glyphs.
export function prettyAmount(raw: string): string {
  return raw
    .replace(/\*/g, " × ")
    .replace(/\//g, " ÷ ")
    .replace(/\+/g, " + ")
    .replace(/-/g, " − ")
    .trim();
}

export function AmountInput({
  value,
  onChange,
  currency = "RM",
  placeholder = "0.00",
  maxDecimals,
  expression = false,
  open,
  onOpenChange,
}: {
  value?: string | number;
  onChange?: (v: string) => void;
  currency?: string;
  placeholder?: string;
  // When set, sanitize input to a number with at most this many decimal places.
  maxDecimals?: number;
  // Accept simple sums ("12.50+3.20*2"). Pair with <AmountKeypad open={open}>
  // rendered as a sibling of the enclosing Row, so the pad spans the form.
  expression?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const raw = String(value ?? "");

  const resolve = () => {
    if (!expression || !HAS_OPERATOR.test(raw)) return;
    const n = evaluateAmount(raw);
    if (n !== null) onChange?.(formatAmountResult(n));
  };

  // Phones get a tap target instead of an input: with no real field focused the
  // OS keypad never opens, which is what lets the pad sit inline in the form.
  if (expression && isMobile) {
    return (
      <span className="fld has-cur">
        <span className="fld-cur">{currency}</span>
        <div
          className={`fld-input fld-amt${open ? " on" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => onOpenChange?.(!open)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenChange?.(!open);
            }
          }}
        >
          <span className={raw ? "amt-val" : "amt-val amt-ph"}>
            {raw ? prettyAmount(raw) : placeholder}
          </span>
          {open && <span className="amt-caret" />}
        </div>
      </span>
    );
  }

  return (
    <span className="fld has-cur">
      <span className="fld-cur">{currency}</span>
      <input
        className="fld-input"
        inputMode="decimal"
        value={raw}
        onChange={(e) =>
          onChange?.(
            expression
              ? e.target.value.replace(/[^0-9.+*/() -]/g, "")
              : maxDecimals != null
                ? clampDecimals(e.target.value, maxDecimals)
                : e.target.value,
          )
        }
        onFocus={() => onOpenChange?.(true)}
        onBlur={() => {
          onOpenChange?.(false);
          resolve();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") resolve();
        }}
        placeholder={placeholder}
      />
    </span>
  );
}

const KEY_ROWS: string[][] = [
  ["C", "(", ")", "/"],
  ["7", "8", "9", "*"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "+"],
  ["0", ".", "back", "="],
];
const KEY_FACES: Record<string, string> = { "*": "×", "/": "÷", "-": "−" };

function BackspaceIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6H9.5L4 12l5.5 6H20a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z" />
      <path d="M16 10l-4 4M12 10l4 4" />
    </svg>
  );
}

// The calculator that expands under the Amount field. Render it as a sibling of
// the Row holding the field so it spans the whole form, not one grid column.
export function AmountKeypad({
  open,
  value,
  onChange,
  onClose,
  currency = "RM",
}: {
  open?: boolean;
  value?: string | number;
  onChange?: (v: string) => void;
  onClose?: () => void;
  currency?: string;
}) {
  const isMobile = useIsMobile();
  const raw = String(value ?? "");
  const result = evaluateAmount(raw);
  const isSum = HAS_OPERATOR.test(raw.slice(1)) || raw.startsWith("(");

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest(".amt-pad") || t?.closest(".fld")) return;
      onClose?.();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, onClose]);

  if (!open) return null;

  const press = (k: string) => {
    if (k === "C") return onChange?.("");
    if (k === "back") return onChange?.(raw.slice(0, -1));
    if (k === "=") {
      if (result === null) return;
      onChange?.(formatAmountResult(result));
      onClose?.();
      return;
    }
    onChange?.(raw + k);
  };

  const keyClass = (k: string) => {
    if (k === "C") return "amt-key amt-key-clr";
    if (k === "back" || k === "(" || k === ")") return "amt-key amt-key-fn";
    if (k === "=") return `amt-key amt-key-eq${result === null ? " amt-key-off" : ""}`;
    if (KEY_FACES[k] || k === "+") return "amt-key amt-key-op";
    return "amt-key";
  };

  const resultText =
    raw === "" ? `${currency} 0.00` : result === null ? "—" : `${currency} ${formatAmountResult(result)}`;
  const resultClass = result === null || raw === "" ? "amt-res amt-res-idle" : "amt-res";

  const keys = (
    <div className="amt-keys">
      {KEY_ROWS.flat().map((k) => (
        <button
          key={k}
          type="button"
          className={keyClass(k)}
          // Keep focus (and the desktop input's ring) on the field.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => press(k)}
        >
          {k === "back" ? <BackspaceIcon /> : (KEY_FACES[k] ?? k)}
        </button>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <div className="amt-pad amt-pad-m">
        <div className="amt-echo-row">
          <span className="amt-echo">{isSum && result !== null ? prettyAmount(raw) : ""}</span>
          <span className={resultClass}>{resultText}</span>
        </div>
        {keys}
      </div>
    );
  }

  return (
    <div className="amt-pad">
      <div className="amt-disp">
        <div className="amt-disp-top">
          <span className="amt-disp-lbl">Working</span>
          <span className="amt-echo">{raw === "" ? "Nothing entered yet" : prettyAmount(raw)}</span>
          <span className={`${resultClass} amt-res-lg`}>
            {result === null && raw !== "" ? "Incomplete" : resultText}
          </span>
        </div>
        <span className="amt-hint">Type + − × ÷ straight into the field, or use the keys. Enter commits.</span>
      </div>
      {keys}
    </div>
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
