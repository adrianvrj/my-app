'use client';

import { useCallback, useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCavos } from '@cavos/kit/react';
import type { CavosSolana } from '@cavos/kit';
import { formatUnits, parseUnits, shorten } from './config';
import type { ActivityItem } from './ui';
import type { TokenEntry } from './TokenList';
import type { SendToken } from './SendForm';

export interface SolanaWalletData {
  address: string | null;
  network: string;
  ready: boolean;
  blocked: boolean;
  statusLabel: string;
  tokens: TokenEntry[];
  sendTokens: SendToken[];
  balancesLoading: boolean;
  activity: ActivityItem[];
  /** Native SOL send via execute_transfer. */
  onSend: (recipient: string, amount: string, symbol: string) => Promise<string>;
  onRefresh: () => void;
}

/** Single-chain Solana wallet data, read from the Solana CavosProvider. */
export function useSolanaWallet(): SolanaWalletData {
  const { wallet, walletStatus } = useCavos();
  const solWallet = (wallet?.chain === 'solana' ? wallet : null) as CavosSolana | null;
  const address = solWallet?.address ?? null;
  const [lamports, setLamports] = useState<bigint | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const refreshBalance = useCallback(async () => {
    if (!solWallet || !address) return;
    setBalancesLoading(true);
    try {
      const bal = await solWallet.connection.getBalance(new PublicKey(address));
      setLamports(BigInt(bal));
    } catch {
      /* non-fatal */
    } finally {
      setBalancesLoading(false);
    }
  }, [solWallet, address]);

  useEffect(() => {
    if (walletStatus.isReady) refreshBalance();
  }, [walletStatus.isReady, refreshBalance]);

  // ── Native SOL send (execute_transfer) ──
  const onSend = useCallback(
    async (recipient: string, amount: string, _symbol: string): Promise<string> => {
      if (!solWallet) throw new Error('Solana wallet not ready yet.');
      const raw = parseUnits(amount || '0', 9);
      const signature = await solWallet.execute(raw, recipient);
      setActivity((prev) => [
        {
          id: signature,
          kind: 'send',
          amount: formatUnits(raw, 9),
          symbol: 'SOL',
          to: shorten(recipient),
          href: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
          ts: Date.now(),
        },
        ...prev,
      ]);
      refreshBalance();
      return signature;
    },
    [solWallet, refreshBalance],
  );

  const blocked = walletStatus.needsDeviceApproval;
  const ready = walletStatus.isReady && !blocked;
  const statusLabel = blocked ? 'Needs approval' : walletStatus.isReady ? 'Ready' : 'Connecting';

  const displayBalance = lamports != null ? formatUnits(lamports, 9) : '—';

  const tokens: TokenEntry[] = [
    { symbol: 'SOL', name: 'Solana', balance: displayBalance, chain: 'solana' as const },
  ];
  const sendTokens: SendToken[] = [{ symbol: 'SOL', decimals: 9, displayBalance }];

  return {
    address,
    network: 'Devnet',
    ready,
    blocked,
    statusLabel,
    tokens,
    sendTokens,
    balancesLoading,
    activity,
    onSend,
    onRefresh: refreshBalance,
  };
}
