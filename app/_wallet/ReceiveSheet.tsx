'use client';

import { QRCode } from './QRCode';
import { CopyButton } from './ui';

export function ReceiveSheet({
  address,
  chain,
  network,
}: {
  address: string;
  chain: 'starknet' | 'solana' | 'stellar';
  network: string;
}) {
  return (
    <div className="flex flex-col items-center gap-5">
      <QRCode value={address} size={180} />

      <div className="flex w-full flex-col gap-2">
        <span className="text-center text-[13px] font-medium text-ink-secondary">
          Your {chain} address
        </span>
        <p className="break-all text-center font-mono text-[13px] leading-relaxed text-ink">
          {address}
        </p>
      </div>

      <div className="flex w-full justify-center">
        <CopyButton value={address} />
      </div>

      <p className="text-center text-[12px] text-ink-muted">
        Only send {chain} ({network}) assets to this address.
      </p>
    </div>
  );
}
