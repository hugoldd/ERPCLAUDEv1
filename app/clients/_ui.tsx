'use client';

import React, { useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';

export function useClientUi() {
  const { colors } = useTheme() as unknown as { colors: Record<string, string> };

  return useMemo(() => {
    const bg = colors.background ?? '#0b0f19';
    const card = colors.card ?? '#111827';
    const text = colors.text ?? '#e5e7eb';
    const border = colors.border ?? 'rgba(255,255,255,0.08)';
    const accent = colors.accent ?? '#6d28d9';
    const success = colors.success ?? '#22c55e';
    const warning = colors.warning ?? '#f59e0b';
    const danger = colors.danger ?? '#ef4444';
    const muted = colors.muted ?? 'rgba(229,231,235,0.75)';

    return {
      c: { bg, card, text, border, accent, success, warning, danger, muted },
      cardStyle: { backgroundColor: card, border: `1px solid ${border}`, borderRadius: 16 } as React.CSSProperties,
      inputStyle: { border: `1px solid ${border}`, borderRadius: 12, backgroundColor: 'transparent' } as React.CSSProperties,
      btnStyle: { border: `1px solid ${border}`, borderRadius: 12 } as React.CSSProperties,
      btnPrimaryStyle: { backgroundColor: accent, borderRadius: 12 } as React.CSSProperties
    };
  }, [colors]);
}

export function formatCurrencyEUR(n: number | null | undefined) {
  const v = typeof n === 'number' ? n : 0;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
}

export function formatDateFR(iso: string | null | undefined) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR');
}

export function Badge(props: { label: string; tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' }) {
  const ui = useClientUi();
  const tone = props.tone ?? 'neutral';
  const bg =
    tone === 'accent' ? `${ui.c.accent}22` :
    tone === 'success' ? `${ui.c.success}22` :
    tone === 'warning' ? `${ui.c.warning}22` :
    tone === 'danger' ? `${ui.c.danger}22` :
    'rgba(255,255,255,0.06)';

  const border =
    tone === 'accent' ? ui.c.accent :
    tone === 'success' ? ui.c.success :
    tone === 'warning' ? ui.c.warning :
    tone === 'danger' ? ui.c.danger :
    ui.c.border;

  return (
    <span
      className="inline-flex items-center px-2 py-1 text-xs whitespace-nowrap"
      style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 999 }}
    >
      {props.label}
    </span>
  );
}

export function SectionHeader(props: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-lg font-semibold">{props.title}</div>
        {props.subtitle ? <div className="mt-1 text-sm opacity-80">{props.subtitle}</div> : null}
      </div>
      {props.right ? <div className="flex gap-2 flex-wrap">{props.right}</div> : null}
    </div>
  );
}

// Confirm modal : wrapper robuste (au besoin)
import Modal from '@/components/ui/Modal';
const AnyModal = Modal as unknown as React.FC<any>;

export function ConfirmModal(props: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  busy?: boolean;
}) {
  const ui = useClientUi();
  const confirmLabel = props.confirmLabel ?? 'Confirmer';
  const cancelLabel = props.cancelLabel ?? 'Annuler';

  return (
    <AnyModal isOpen={props.open} onClose={props.onClose} title={props.title}>
      <div className="text-sm opacity-90">{props.message}</div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="px-4 py-2 text-sm" style={ui.btnStyle} onClick={props.onClose} disabled={props.busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className="px-4 py-2 text-sm font-semibold"
          style={{
            borderRadius: 12,
            backgroundColor: props.destructive ? ui.c.danger : ui.c.accent
          }}
          onClick={props.onConfirm}
          disabled={props.busy}
        >
          {props.busy ? '...' : confirmLabel}
        </button>
      </div>
    </AnyModal>
  );
}
