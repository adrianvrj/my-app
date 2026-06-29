'use client';

import { useEffect } from 'react';
import { X } from '@phosphor-icons/react';

export function ActionSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="relative w-full max-w-[520px] animate-sheet-up rounded-t-3xl bg-surface ring-1 ring-line sm:rounded-2xl">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-line-strong" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-divider px-5 py-4">
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            aria-label="Close"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
