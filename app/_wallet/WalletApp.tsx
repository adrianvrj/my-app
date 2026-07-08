'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SignOut } from '@phosphor-icons/react';
import { useCavos } from '@cavos/kit/react';
import { useStarknetWallet } from './StarknetPanel';
import { useSolanaWallet } from './SolanaPanel';
import { useStellarWallet } from './StellarPanel';
import {
  Activity,
  ActionButton,
  Button,
  ChainBadge,
  ContentTabs,
  IconSend,
  IconReceive,
  Notice,
} from './ui';
import { ActionSheet } from './ActionSheet';
import { SendForm } from './SendForm';
import { ReceiveSheet } from './ReceiveSheet';
import { TokenList } from './TokenList';
import { WalletOrb } from './WalletOrb';
import { PasskeyPanel } from './PasskeyPanel';
import { shorten } from './config';

type Chain = 'starknet' | 'solana' | 'stellar';

function CavosWordmark() {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/CavosLogo.png"
        alt="Cavos"
        width={20}
        height={24}
        style={{ height: 'auto' }}
        className="brightness-0 invert"
      />
    </div>
  );
}

/**
 * Single-chain wallet. Each route mounts its own CavosProvider for one chain and
 * renders <WalletApp chain="…" />. The three data hooks all read useCavos() and
 * no-op unless the connected wallet matches their chain, so calling all three
 * keeps the Rules of Hooks satisfied while only one is live.
 */
export function WalletApp({ chain }: { chain: Chain }) {
  const { openModal, isAuthenticated, logout } = useCavos();

  if (!isAuthenticated) {
    return <SignIn chain={chain} onSignIn={openModal} />;
  }
  return <WalletView chain={chain} onSignOut={logout} />;
}

function WalletView({ chain, onSignOut }: { chain: Chain; onSignOut: () => void }) {
  const starknet = useStarknetWallet();
  const solana = useSolanaWallet();
  const stellar = useStellarWallet();
  const active = chain === 'starknet' ? starknet : chain === 'solana' ? solana : stellar;

  const [sheet, setSheet] = useState<'send' | 'receive' | null>(null);
  const [tab, setTab] = useState<'tokens' | 'activity'>('tokens');
  const [selfFundedBusy, setSelfFundedBusy] = useState(false);
  const [selfFundedMsg, setSelfFundedMsg] = useState<{ ok: boolean; text: string; href?: string } | null>(null);

  const heroBalance = active.tokens[0]?.balance ?? '—';
  const heroSymbol = active.tokens[0]?.symbol ?? '';
  const address = active.address;

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/20 blur-[100px]"
      />

      {/* Header */}
      <header className="relative flex items-center justify-between px-5 pt-6 pb-3">
        <CavosWordmark />
        <div className="flex items-center gap-2">
          <ChainBadge chain={chain} network={active.network} />
          <button
            onClick={onSignOut}
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink-muted ring-1 ring-line transition-colors hover:bg-surface-hover hover:text-ink-secondary"
          >
            <SignOut size={15} weight="bold" />
          </button>
        </div>
      </header>

      {/* Balance hero */}
      <section className="relative flex flex-col items-center px-5 pt-10 pb-7 animate-balance-in">
        <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-ink-muted">
          Total balance
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[52px] font-bold leading-none tracking-[-0.035em] tabular-nums text-ink">
            {heroBalance}
          </span>
          <span className="text-[20px] font-semibold text-ink-muted">{heroSymbol}</span>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 ring-1 ring-line">
          <span className={`h-1.5 w-1.5 rounded-full ${active.ready ? 'bg-success' : 'bg-warning'}`} />
          <span className="text-[12px] font-medium text-ink-secondary">{active.statusLabel}</span>
          {address && (
            <>
              <span className="h-3 w-px bg-line-strong" />
              <span className="font-mono text-[12px] text-ink-muted">{shorten(address)}</span>
            </>
          )}
        </div>
      </section>

      {/* Actions */}
      <section className="relative flex items-center justify-center gap-12 px-5 pb-9">
        <ActionButton primary icon={<IconSend />} label="Send" onClick={() => setSheet('send')} />
        <ActionButton icon={<IconReceive />} label="Receive" onClick={() => setSheet('receive')} />
      </section>

      {/* Passkey device-approvals (single-chain) */}
      <PasskeyPanel />

      {/* Self-funded signature probe (Stellar only): sends 1 stroop without the
          relayer to verify the device-unlocked control key signs end-to-end. */}
      {chain === 'stellar' && (
        <section className="px-5 pb-4">
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
            <p className="text-[13px] font-medium text-ink-secondary">
              Self-funded signature test
            </p>
            <p className="mt-1 text-[12px] leading-snug text-ink-muted">
              Sends 1 stroop of XLM to yourself with <strong>no relayer</strong> — the
              account pays its own fee and the device-unlocked control key signs.
              For verifying the signature path only.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button
                variant="secondary"
                disabled={!active.ready || selfFundedBusy}
                onClick={async () => {
                  setSelfFundedBusy(true);
                  setSelfFundedMsg(null);
                  try {
                    const hash = await stellar.onSendSelfFunded();
                    setSelfFundedMsg({
                      ok: true,
                      text: `Signed without relayer — tx ${shorten(hash)}`,
                      href: `https://stellar.expert/explorer/testnet/tx/${hash}`,
                    });
                  } catch (e) {
                    setSelfFundedMsg({
                      ok: false,
                      text: e instanceof Error ? e.message : 'Self-funded send failed.',
                    });
                  } finally {
                    setSelfFundedBusy(false);
                  }
                }}
              >
                {selfFundedBusy ? 'Signing…' : 'Send 1 stroop (no relayer)'}
              </Button>
            </div>
            {selfFundedMsg && (
              <div className="mt-3">
                <Notice tone={selfFundedMsg.ok ? 'info' : 'error'}>
                  <span className="flex flex-wrap items-center gap-2">
                    {selfFundedMsg.text}
                    {selfFundedMsg.href && (
                      <a
                        href={selfFundedMsg.href}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline underline-offset-2"
                      >
                        View on explorer ↗
                      </a>
                    )}
                  </span>
                </Notice>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Content tabs */}
      <section className="relative flex-1 px-5 pb-8">
        <ContentTabs
          active={tab}
          onChange={(v) => setTab(v as 'tokens' | 'activity')}
          options={[
            { value: 'tokens', label: 'Tokens' },
            { value: 'activity', label: 'Activity' },
          ]}
        />
        <div className="pt-4">
          {tab === 'tokens' ? (
            <TokenList tokens={active.tokens} loading={active.balancesLoading} />
          ) : (
            <Activity items={active.activity} />
          )}
        </div>
      </section>

      {/* Action sheet */}
      <ActionSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === 'send' ? 'Send' : 'Receive'}
      >
        {sheet === 'send' && address && (
          <>
            {!active.ready && active.blocked && (
              <div className="mb-3">
                <Notice tone="info">This account needs device approval before sending.</Notice>
              </div>
            )}
            <SendForm
              tokens={active.sendTokens}
              defaultSymbol={active.sendTokens[0]?.symbol ?? heroSymbol}
              onSend={async (recipient, amount, symbol) => {
                await active.onSend(recipient, amount, symbol);
              }}
              busy={false}
              disabled={!active.ready}
              recipientLabel={`Recipient (${chain})`}
              recipientPlaceholder={
                chain === 'starknet' ? '0x…' : chain === 'stellar' ? 'G… address' : 'Public key'
              }
            />
          </>
        )}
        {sheet === 'receive' && address && (
          <ReceiveSheet address={address} chain={chain} network={active.network} />
        )}
      </ActionSheet>
    </main>
  );
}

function SignIn({ chain, onSignIn }: { chain: Chain; onSignIn: () => void }) {
  const label = chain.charAt(0).toUpperCase() + chain.slice(1);
  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-5">
      <WalletOrb />
      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center gap-8 animate-balance-in">
        <div className="flex items-center gap-2.5">
          <Image
            src="/CavosLogo.png"
            alt="Cavos"
            width={36}
            height={44}
            style={{ height: 'auto' }}
            className="brightness-0 invert"
          />
        </div>
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink">
            Your {label} wallet.
          </h1>
          <p className="max-w-[340px] text-[15px] leading-relaxed text-ink-secondary">
            One sign-in provisions a device-bound account on {label}. Gasless, no seed phrases, no extensions.
          </p>
        </div>
        <Button onClick={onSignIn} variant="primary" className="w-full max-w-[340px] py-3.5 text-[15px]">
          Sign in
        </Button>
        <p className="text-center text-[12px] text-ink-muted">
          Secured by a silent device key. You hold the keys, not us.
        </p>
      </div>
    </main>
  );
}
