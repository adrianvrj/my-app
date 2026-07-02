'use client';

import { useState } from 'react';
import {
  ArrowDownLeft,
  ShieldCheck,
  Copy,
  ArrowsClockwise,
  Check,
  CaretDown,
  PaperPlaneTilt,
} from '@phosphor-icons/react';

// Re-export Phosphor icon wrappers with consistent sizing
export const IconSend = () => <PaperPlaneTilt size={18} weight="fill" aria-hidden />;
export const IconReceive = () => <ArrowDownLeft size={18} weight="bold" aria-hidden />;
export const IconApprove = () => <ShieldCheck size={18} weight="bold" aria-hidden />;
export const IconCopy = () => <Copy size={14} weight="bold" aria-hidden />;
export const IconRefresh = () => <ArrowsClockwise size={16} weight="bold" aria-hidden />;
export const IconCheck = () => <Check size={14} weight="bold" aria-hidden />;
export const IconCaretDown = () => <CaretDown size={12} weight="bold" aria-hidden />;

// ── Network marks ──────────────────────────────────────────────────────────
export function NetworkMark({ chain }: { chain: 'starknet' | 'solana' | 'stellar' }) {
  if (chain === 'stellar') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5.5 8.5 18.5 15M18.5 8.5 5.5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (chain === 'solana') {
    return (
      <svg width="15" height="13" viewBox="0 0 24 20" fill="none" aria-hidden>
        <path d="M4 4.2 7 1h13l-3 3.2H4Z" fill="currentColor" />
        <path d="M4 11.6 7 8.4h13l-3 3.2H4Z" fill="currentColor" />
        <path d="M20 19 17 15.8H4l3 3.2h13Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="13" height="15" viewBox="0 0 20 24" fill="none" aria-hidden>
      <path
        d="M10 0c.6 5 1.6 7 4.5 9.5C12 11 11 13 10 24 9 13 8 11 5.5 9.5 8.4 7 9.4 5 10 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

// ── Chain badge (header chain selector) ─────────────────────────────────────
export function ChainBadge({
  chain,
  network,
  onClick,
}: {
  chain: 'starknet' | 'solana' | 'stellar';
  network: string;
  /** Optional: when omitted the badge is a static, non-interactive label. */
  onClick?: () => void;
}) {
  const interactive = typeof onClick === 'function';
  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      className={`flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 ring-1 ring-line ${
        interactive ? 'transition-colors hover:bg-surface-hover' : 'cursor-default'
      }`}
    >
      <span className="h-2 w-2 rounded-full bg-success" />
      <span className="text-[13px] font-medium capitalize text-ink-secondary">
        {chain}
      </span>
      <span className="text-[12px] text-ink-muted">· {network}</span>
      {interactive && <IconCaretDown />}
    </button>
  );
}

// ── Action button (circular, always visible) ────────────────────────────────
export function ActionButton({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-2.5">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 active:scale-90 group-hover:scale-105 ${
          primary
            ? 'bg-accent text-white shadow-[0_4px_24px_var(--color-accent-glow)] group-hover:shadow-[0_6px_32px_var(--color-accent-glow)]'
            : 'bg-surface text-ink ring-1 ring-line group-hover:bg-surface-hover'
        }`}
      >
        {icon}
      </span>
      <span className="text-[13px] font-medium text-ink-secondary">{label}</span>
    </button>
  );
}

// ── Content tabs (Tokens / Activity) ────────────────────────────────────────
export function ContentTabs({
  active,
  onChange,
  options,
}: {
  active: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex gap-6 border-b border-divider">
      {options.map((o) => {
        const on = o.value === active;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`relative pb-3 text-[15px] font-semibold transition-colors ${
              on ? 'text-ink' : 'text-ink-muted hover:text-ink-secondary'
            }`}
          >
            {o.label}
            {on && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Button (pill CTAs) ──────────────────────────────────────────────────────
export function Button({
  children,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const base =
    'inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base';
  const styles: Record<string, string> = {
    primary:
      'bg-accent text-white px-5 py-3 text-[15px] hover:bg-accent-hover shadow-[0_2px_16px_var(--color-accent-glow)]',
    secondary:
      'bg-surface text-ink px-5 py-3 text-[15px] ring-1 ring-line hover:bg-surface-hover',
    ghost: 'text-ink-secondary px-4 py-2.5 text-[14px] hover:text-ink',
  };
  return (
    <button
      {...props}
      className={`${base} ${styles[variant]} ${props.className ?? ''}`}
    >
      {children}
    </button>
  );
}

// ── Status pill ─────────────────────────────────────────────────────────────
export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'ready' | 'pending' | 'idle';
}) {
  const colors = {
    ready: { bg: 'rgba(23, 184, 90, 0.14)', fg: '#17B85A', dot: '#17B85A' },
    pending: { bg: 'rgba(240, 165, 0, 0.14)', fg: '#F0A500', dot: '#F0A500' },
    idle: { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.55)', dot: 'rgba(255,255,255,0.35)' },
  }[tone];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: colors.bg, color: colors.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors.dot }} />
      {label}
    </span>
  );
}

// ── Field ───────────────────────────────────────────────────────────────────
export function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
  rightAction,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  rightAction?: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink-secondary">{label}</span>
      <div className="relative flex items-center">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl bg-surface px-4 py-3 text-[15px] text-ink outline-none ring-1 ring-line transition placeholder:text-ink-muted focus:ring-2 focus:ring-accent/50 ${
            mono ? 'font-mono text-[14px]' : ''
          } ${rightAction ? 'pr-20' : ''}`}
        />
        {rightAction && <div className="absolute right-2">{rightAction}</div>}
      </div>
    </label>
  );
}

// ── Max button (right action for amount field) ──────────────────────────────
export function MaxButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-accent-soft px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-accent transition-colors hover:bg-accent/25"
    >
      Max
    </button>
  );
}

// ── Notice ──────────────────────────────────────────────────────────────────
export function Notice({
  tone,
  children,
}: {
  tone: 'ok' | 'error' | 'info';
  children: React.ReactNode;
}) {
  const c = {
    ok: 'border-success/20 bg-success-soft text-success',
    error: 'border-danger/20 bg-danger-soft text-danger',
    info: 'border-line bg-surface text-ink-secondary',
  }[tone];

  return (
    <p className={`rounded-xl border p-3 text-[13px] leading-relaxed ${c}`}>{children}</p>
  );
}

// ── Token row (dense portfolio list) ────────────────────────────────────────
export interface TokenRowData {
  symbol: string;
  name: string;
  balance: string;
  icon: React.ReactNode;
}

export function TokenRow({ symbol, name, balance, icon }: TokenRowData) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl px-2 py-3 transition-colors hover:bg-surface/60">
      {icon}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold leading-none text-ink">{symbol}</span>
        <span className="text-[13px] leading-none text-ink-muted">{name}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[15px] font-semibold leading-none tabular-nums text-ink">
          {balance}
        </span>
        <span className="text-[13px] leading-none text-ink-muted">{symbol}</span>
      </div>
    </div>
  );
}

// ── Activity ────────────────────────────────────────────────────────────────
export interface ActivityItem {
  id: string;
  kind: 'send' | 'approve';
  amount: string;
  symbol: string;
  to: string;
  href: string;
  ts: number;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function Activity({ items }: { items: ActivityItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-ink-muted">
            <ArrowsClockwise size={20} weight="bold" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-[14px] font-medium text-ink-secondary">No activity yet</span>
            <span className="text-[13px] text-ink-muted">Your transactions will appear here.</span>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-divider overflow-hidden rounded-2xl bg-surface">
          {items.map((it) => (
            <li key={it.id}>
              <a
                href={it.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-hover"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    it.kind === 'send' ? 'bg-accent-soft text-accent' : 'bg-success-soft text-success'
                  }`}
                >
                  {it.kind === 'send' ? <IconSend /> : <IconApprove />}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[14px] font-medium text-ink">
                    {it.kind === 'send' ? 'Sent' : 'Approved'} {it.amount} {it.symbol}
                  </span>
                  <span className="truncate font-mono text-[12px] text-ink-muted">to {it.to}</span>
                </div>
                <span className="shrink-0 text-[12px] text-ink-muted">{timeAgo(it.ts)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Copy button ─────────────────────────────────────────────────────────────
export function CopyButton({ value, light }: { value: string; light?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      onClick={copy}
      aria-label="Copy address"
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all active:scale-95 ${
        light
          ? 'bg-white/10 text-ink-secondary hover:bg-white/20 hover:text-ink'
          : 'bg-surface-raised text-ink-muted hover:bg-surface-hover hover:text-ink-secondary'
      }`}
    >
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
