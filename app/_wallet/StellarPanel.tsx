'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCavos } from '@cavos/kit/react';
import type { CavosStellar } from '@cavos/kit';
import { formatUnits, parseUnits, shorten, STELLAR_DECIMALS } from './config';
import type { ActivityItem } from './ui';
import type { TokenEntry } from './TokenList';
import type { SendToken } from './SendForm';

export interface StellarWalletData {
  address: string | null;
  network: string;
  ready: boolean;
  blocked: boolean;
  statusLabel: string;
  tokens: TokenEntry[];
  sendTokens: SendToken[];
  balancesLoading: boolean;
  activity: ActivityItem[];
  /** Native XLM send via the account's __check_auth-guarded transfer. */
  onSend: (recipient: string, amount: string, symbol: string) => Promise<string>;
  onRefresh: () => void;
}

/** Single-chain Stellar wallet data, read from the Stellar CavosProvider. */
export function useStellarWallet(): StellarWalletData {
  const { wallet, walletStatus } = useCavos();
  const xlmWallet = (wallet?.chain === 'stellar' ? wallet : null) as CavosStellar | null;
  const address = xlmWallet?.address ?? null;
  const [stroops, setStroops] = useState<bigint | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const refreshBalance = useCallback(async () => {
    if (!xlmWallet) return;
    setBalancesLoading(true);
    try {
      setStroops(await xlmWallet.balance());
    } catch {
      /* non-fatal */
    } finally {
      setBalancesLoading(false);
    }
  }, [xlmWallet]);

  useEffect(() => {
    if (walletStatus.isReady) refreshBalance();
  }, [walletStatus.isReady, refreshBalance]);

  // ── Native XLM send (device-signed via __check_auth) ──
  const onSend = useCallback(
    async (recipient: string, amount: string, _symbol: string): Promise<string> => {
      if (!xlmWallet) throw new Error('Stellar wallet not ready yet.');
      const raw = parseUnits(amount || '0', STELLAR_DECIMALS);
      const hash = await xlmWallet.execute(raw, recipient);
      setActivity((prev) => [
        {
          id: hash,
          kind: 'send',
          amount: formatUnits(raw, STELLAR_DECIMALS),
          symbol: 'XLM',
          to: shorten(recipient),
          href: `https://stellar.expert/explorer/testnet/tx/${hash}`,
          ts: Date.now(),
        },
        ...prev,
      ]);
      refreshBalance();
      return hash;
    },
    [xlmWallet, refreshBalance],
  );

  const blocked = walletStatus.needsDeviceApproval;
  const ready = walletStatus.isReady && !blocked;
  const statusLabel = blocked ? 'Needs approval' : walletStatus.isReady ? 'Ready' : 'Connecting';

  const displayBalance = stroops != null ? formatUnits(stroops, STELLAR_DECIMALS) : '—';

  const tokens: TokenEntry[] = [
    { symbol: 'XLM', name: 'Stellar Lumens', balance: displayBalance, chain: 'stellar' as const },
  ];
  const sendTokens: SendToken[] = [{ symbol: 'XLM', decimals: STELLAR_DECIMALS, displayBalance }];

  return {
    address,
    network: 'Testnet',
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
