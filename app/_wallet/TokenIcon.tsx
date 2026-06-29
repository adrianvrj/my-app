'use client';

import { useState } from 'react';

/**
 * Token logo with graceful fallback. Loads the real token image from a CDN
 * (TrustWallet assets via jsDelivr); if it fails, renders a tinted circle with
 * the symbol's first letter. Plain <img> (not next/image) so external CDN
 * logos work without remote-pattern config or optimizer round-trips.
 */
const TOKEN_LOGOS: Record<string, string> = {
  STRK: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/assets/0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766/logo.png',
  ETH: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/info/logo.png',
  SOL: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/solana/info/logo.png',
};

export function TokenIcon({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = TOKEN_LOGOS[symbol];

  if (!src || failed) {
    return (
      <span
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-[15px] font-semibold text-ink-secondary"
      >
        {symbol.charAt(0)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={symbol}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full"
      style={{ width: size, height: size }}
    />
  );
}
