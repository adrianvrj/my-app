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
  /**
   * Self-funded probe (NO relayer): reconnects this identity in self-funded mode
   * (no `appId` → no relayer) and submits a 1-stroop payment signed silently by the
   * device-unlocked control key, paid for by the account itself. Use this to verify
   * the device-signature path end-to-end without the relayer. The account must
   * already exist (created earlier via the relayer). Returns the tx hash.
   */
  onSendSelfFunded: () => Promise<string>;
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

  // ── Self-funded probe (NO relayer): proves the device signature works without
  //    the relayer. Uses the per-execute `{ sponsored: false }` flag so the same
  //    connected wallet submits directly — the control key signs, the account
  //    pays its own (tiny) fee from its XLM balance. No reconnect, no separate
  //    identity. The account must hold at least the fee + base reserve.
  const onSendSelfFunded = useCallback(async (): Promise<string> => {
    if (!xlmWallet) throw new Error('Stellar wallet not ready yet.');
    if (!address) throw new Error('Stellar address not resolved yet.');
    // 1 stroop back to self — minimal payload, just to exercise the signature.
    const oneStroop = BigInt(1);
    const hash = await xlmWallet.execute(oneStroop, address, { sponsored: false });
    setActivity((prev) => [
      {
        id: hash,
        kind: 'send',
        amount: formatUnits(oneStroop, STELLAR_DECIMALS),
        symbol: 'XLM',
        to: shorten(address),
        href: `https://stellar.expert/explorer/testnet/tx/${hash}`,
        ts: Date.now(),
      },
      ...prev,
    ]);
    refreshBalance();
    return hash;
  }, [xlmWallet, address, refreshBalance]);

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
    onSendSelfFunded,
    onRefresh: refreshBalance,
  };
}
