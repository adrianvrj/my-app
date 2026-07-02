'use client';

import { NetworkMark, TokenRow } from './ui';
import { TokenIcon } from './TokenIcon';

export interface TokenEntry {
  symbol: string;
  name: string;
  /** Human-formatted balance string (e.g. "1,234.56"). */
  balance: string;
  chain: 'starknet' | 'solana' | 'stellar';
}

export function TokenList({
  tokens,
  loading,
}: {
  tokens: TokenEntry[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col divide-y divide-divider">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 px-1 py-3.5">
            <div className="skeleton-shimmer h-10 w-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="skeleton-shimmer h-4 w-16 rounded" />
              <div className="skeleton-shimmer h-3 w-24 rounded" />
            </div>
            <div className="skeleton-shimmer h-4 w-20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-ink-muted">
          <NetworkMark chain="starknet" />
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-[14px] font-medium text-ink-secondary">No tokens found</span>
          <span className="text-[13px] text-ink-muted">Token balances will appear here.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {tokens.map((t) => (
        <TokenRow
          key={t.symbol}
          symbol={t.symbol}
          name={t.name}
          balance={t.balance}
          icon={<TokenIcon symbol={t.symbol} size={40} />}
        />
      ))}
    </div>
  );
}
