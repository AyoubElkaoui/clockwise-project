"use client";

import React, { useEffect, useState } from "react";
import { Send, Trash2, AlertTriangle } from "lucide-react";

/**
 * App-eigen bevestigingsdialoog ter vervanging van window.confirm.
 *   const ok = await confirmDialog({ title: "Uren inleveren", body: "…", okLabel: "Inleveren" });
 * <ConfirmHost /> staat één keer in de root-layout en rendert de dialoog.
 */
export interface ConfirmOptions {
  title: string;
  body: string;
  okLabel?: string;
  cancelLabel?: string;
  /** rode knop, voor verwijderen */
  danger?: boolean;
  icon?: "send" | "trash" | "warning";
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
const EVENT = "clockd:confirm";

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    window.dispatchEvent(new CustomEvent<Pending>(EVENT, { detail: { ...opts, resolve } }));
  });
}

export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    const onReq = (e: Event) => setPending((e as CustomEvent<Pending>).detail);
    window.addEventListener(EVENT, onReq);
    return () => window.removeEventListener(EVENT, onReq);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  if (!pending) return null;
  const danger = !!pending.danger;
  const Icon = pending.icon === "trash" || (danger && !pending.icon) ? Trash2 : pending.icon === "warning" ? AlertTriangle : Send;

  return (
    <div onClick={() => close(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(10,11,13,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 24px 64px rgba(0,0,0,.3)", padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: danger ? "var(--red-weak)" : "var(--accent-weak)", color: danger ? "var(--red)" : "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Icon size={16} />
          </span>
          <div id="confirm-title" style={{ font: "700 15px 'Geist'", color: "var(--text)" }}>{pending.title}</div>
        </div>
        <div style={{ font: "400 13px 'Geist'", color: "var(--text-2)", lineHeight: 1.5, marginBottom: 18 }}>{pending.body}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={() => close(false)}
            style={{ height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text-2)", font: "600 12.5px 'Geist'", cursor: "pointer" }}>
            {pending.cancelLabel || "Annuleren"}
          </button>
          <button type="button" onClick={() => close(true)} autoFocus
            style={{ height: 32, padding: "0 14px", borderRadius: 8, border: "none", background: danger ? "var(--red)" : "var(--accent)", color: "#fff", font: "600 12.5px 'Geist'", cursor: "pointer" }}>
            {pending.okLabel || "Doorgaan"}
          </button>
        </div>
      </div>
    </div>
  );
}
