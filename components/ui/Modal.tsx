'use client';

import React, { useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const { colors } = useTheme();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div
        className="relative w-full max-w-3xl rounded-xl border shadow-xl"
        style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.text }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: colors.border }}>
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm"
            style={{ color: colors.textSecondary }}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t px-5 py-4" style={{ borderColor: colors.border }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
