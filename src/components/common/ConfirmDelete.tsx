import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { DeleteOutlined } from "@ant-design/icons";
import { useIsMobile } from "@/hooks/useIsMobile";

export interface ConfirmDeleteOptions {
  /** Names the thing, e.g. "Delete this transaction?" */
  title?: string;
  /** Says exactly what goes, e.g. "Jaya Grocer, − RM 186.40 on 2026-11-22, will be removed." */
  content?: string;
  okText?: string;
}

type ConfirmFn = (
  onConfirm: () => void | Promise<void>,
  opts?: ConfirmDeleteOptions,
) => void;

interface Pending {
  onConfirm: () => void | Promise<void>;
  title: string;
  content: string;
  okText: string;
}

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * The app's delete confirmation, in its own form style: a centred panel on
 * desktop, a bottom sheet on phone. Mount once near the root; call through
 * `useConfirmDelete()`.
 */
export function ConfirmDeleteProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const isMobile = useIsMobile();

  const confirm = useCallback<ConfirmFn>((onConfirm, opts) => {
    setPending({
      onConfirm,
      title: opts?.title ?? "Delete this item?",
      content: opts?.content ?? "This can’t be undone.",
      okText: opts?.okText ?? "Delete",
    });
  }, []);

  const close = useCallback(() => {
    if (!busy) setPending(null);
  }, [busy]);

  const run = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await pending.onConfirm();
      setPending(null);
    } catch {
      // The caller reports its own error; keep the dialog open so it can be retried.
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className={isMobile ? "cd-root cd-phone" : "cd-root"}>
          <div className="cd-scrim" onClick={close} />
          <div
            className="cd-box"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cd-title"
            aria-describedby="cd-msg"
          >
            {isMobile && <div className="sheet-grip" />}
            <div className="cd-body">
              <span className="cd-chip">
                <DeleteOutlined />
              </span>
              <div>
                <div id="cd-title" className="cd-title">
                  {pending.title}
                </div>
                <div id="cd-msg" className="cd-msg">
                  {pending.content}
                </div>
              </div>
            </div>
            <div className="cd-foot">
              <button
                type="button"
                className="btn-pill btn-ghost"
                onClick={close}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-pill cd-ok"
                onClick={run}
                disabled={busy}
                autoFocus
              >
                {busy ? "…" : pending.okText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/** Returns a function you call with the delete action and what to say. */
export function useConfirmDelete(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error("useConfirmDelete needs <ConfirmDeleteProvider>");
  return fn;
}
