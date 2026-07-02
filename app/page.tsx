import Link from 'next/link';
import { NetworkMark } from './_wallet/ui';

const CHAINS = [
  { slug: 'starknet', label: 'Starknet', network: 'Sepolia' },
  { slug: 'solana', label: 'Solana', network: 'Devnet' },
  { slug: 'stellar', label: 'Stellar', network: 'Testnet' },
] as const;

export default function Home() {
  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col justify-center px-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">
          Cavos wallets
        </h1>
        <p className="max-w-[360px] text-[15px] leading-relaxed text-ink-secondary">
          One device-bound account per chain. Pick a chain to open its wallet —
          login, balance, send/receive, passkey device approval and recovery.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {CHAINS.map((c) => (
          <Link
            key={c.slug}
            href={`/${c.slug}`}
            className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-4 ring-1 ring-line transition-colors hover:bg-surface-hover"
          >
            <NetworkMark chain={c.slug} />
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold text-ink">{c.label}</span>
              <span className="text-[12px] text-ink-muted">{c.network}</span>
            </div>
            <span className="ml-auto text-ink-muted">→</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
