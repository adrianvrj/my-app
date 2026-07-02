'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SignOut } from '@phosphor-icons/react';
import { CavosProvider, useCavos } from '@cavos/kit/react';
import { modal, starknetConfig } from './config';
import { useSolana } from './useSolana';
import { useStellar } from './useStellar';
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
  NetworkMark,
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

export default function SuperWalletPage() {
  return (
    <CavosProvider config={starknetConfig} modal={modal}>
      <SuperWallet />
    </CavosProvider>
  );
}

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

function SuperWallet() {
  const { openModal, isAuthenticated, user, logout } = useCavos();
  const solana = useSolana(isAuthenticated ? user?.userId : null);
  const stellar = useStellar(isAuthenticated ? user?.userId : null);
  const [chain, setChain] = useState<Chain>('starknet');
  const [sheet, setSheet] = useState<'send' | 'receive' | null>(null);
  const [tab, setTab] = useState<'tokens' | 'activity'>('tokens');
  const [chainMenuOpen, setChainMenuOpen] = useState(false);

  if (!isAuthenticated) {
    return <SignIn onSignIn={openModal} />;
  }

  return (
    <WalletView
      chain={chain}
      setChain={setChain}
      solana={solana}
      stellar={stellar}
      sheet={sheet}
      setSheet={setSheet}
      tab={tab}
      setTab={setTab}
      chainMenuOpen={chainMenuOpen}
      setChainMenuOpen={setChainMenuOpen}
      onSignOut={logout}
    />
  );
}

function WalletView({
  chain,
  setChain,
  solana,
  stellar,
  sheet,
  setSheet,
  tab,
  setTab,
  chainMenuOpen,
  setChainMenuOpen,
  onSignOut,
}: {
  chain: Chain;
  setChain: (c: Chain) => void;
  solana: ReturnType<typeof useSolana>;
  stellar: ReturnType<typeof useStellar>;
  sheet: 'send' | 'receive' | null;
  setSheet: (s: 'send' | 'receive' | null) => void;
  tab: 'tokens' | 'activity';
  setTab: (t: 'tokens' | 'activity') => void;
  chainMenuOpen: boolean;
  setChainMenuOpen: (b: boolean) => void;
  onSignOut: () => void;
}) {
  // All wallet data hooks — only render the active chain's content
  const starknet = useStarknetWallet();
  const solanaWallet = useSolanaWallet(solana);
  const stellarWallet = useStellarWallet(stellar);

  const active =
    chain === 'starknet' ? starknet : chain === 'solana' ? solanaWallet : stellarWallet;

  // Primary balance for the hero (first token of the active chain)
  const heroBalance = active.tokens[0]?.balance ?? '—';
  const heroSymbol = active.tokens[0]?.symbol ?? '';
  const address = active.address;

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col">
      {/* Accent glow backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/20 blur-[100px]"
      />

      {/* Header */}
      <header className="relative flex items-center justify-between px-5 pt-6 pb-3">
        <CavosWordmark />
        <div className="flex items-center gap-2">
          {/* Chain selector */}
          <div className="relative">
            <ChainBadge
              chain={chain}
              network={active.network}
              onClick={() => setChainMenuOpen(!chainMenuOpen)}
            />
            {chainMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setChainMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl bg-surface py-1 ring-1 ring-line animate-fade-in">
                  {(['starknet', 'solana', 'stellar'] as Chain[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setChain(c);
                        setChainMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-[14px] font-medium transition-colors hover:bg-surface-hover ${
                        chain === c ? 'text-accent' : 'text-ink-secondary'
                      }`}
                    >
                      <NetworkMark chain={c} />
                      <span className="capitalize">{c}</span>
                      {chain === c && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={onSignOut}
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink-muted ring-1 ring-line transition-colors hover:bg-surface-hover hover:text-ink-secondary"
          >
            <SignOut size={15} weight="bold" />
          </button>
        </div>
      </header>

      {/* Balance hero — NO CARD, directly on base */}
      {/* Balance hero — NO CARD, centered, directly on base */}
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

      {/* Action circles — always visible */}
      <section className="relative flex items-center justify-center gap-12 px-5 pb-9">
        <ActionButton primary icon={<IconSend />} label="Send" onClick={() => setSheet('send')} />
        <ActionButton icon={<IconReceive />} label="Receive" onClick={() => setSheet('receive')} />
      </section>

      {/* Passkey device-approvals (2FA-style step-up), across all 3 chains */}
      <PasskeyPanel solana={solana.wallet} stellar={stellar.wallet} />

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

function SignIn({ onSignIn }: { onSignIn: () => void }) {
  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-5">
      {/* Cavos silk orb — brand 3D backdrop, adapted to dark */}
      <WalletOrb />

      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center gap-8 animate-balance-in">
        {/* Logo */}
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

        {/* Headline */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink">
            Your wallet, on every chain.
          </h1>
          <p className="max-w-[340px] text-[15px] leading-relaxed text-ink-secondary">
            One sign-in provisions a device-bound account on Starknet, Solana and Stellar. Gasless, no seed phrases, no extensions.
          </p>
        </div>

        {/* CTA */}
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
