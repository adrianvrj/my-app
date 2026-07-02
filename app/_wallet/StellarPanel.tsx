'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatUnits, parseUnits, shorten, STELLAR_DECIMALS } from './config';
import type { StellarState } from './useStellar';
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
  /** Recovery: generate code + register backup signer. */
  onSetupRecovery: () => Promise<string>;
  /** Recovery: recover account with a code. */
  onRecover: (code: string) => Promise<void>;
}

export function useStellarWallet(stellar: StellarState): StellarWalletData {
  const { wallet, address, status, error: connectError } = stellar;
  const [stroops, setStroops] = useState<bigint | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const refreshBalance = useCallback(async () => {
    if (!wallet) return;
    setBalancesLoading(true);
    try {
      setStroops(await wallet.balance());
    } catch {
      /* non-fatal */
    } finally {
      setBalancesLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (status === 'ready') refreshBalance();
  }, [status, refreshBalance]);

  // ── Native XLM send (device-signed via __check_auth) ──
  const onSend = useCallback(
    async (recipient: string, amount: string, _symbol: string): Promise<string> => {
      if (!wallet) throw new Error('Stellar wallet not ready yet.');
      const raw = parseUnits(amount || '0', STELLAR_DECIMALS);
      const hash = await wallet.execute(raw, recipient);
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
    [wallet, refreshBalance],
  );

  // ── Recovery ──
  const onSetupRecovery = useCallback(async (): Promise<string> => {
    if (!wallet) throw new Error('Stellar wallet not ready yet.');
    const { generateRecoveryCode } = await import('@cavos/kit');
    const code = generateRecoveryCode();
    await wallet.setupRecovery(code);
    return code;
  }, [wallet]);

  const onRecover = useCallback(
    async (code: string) => {
      if (!wallet) throw new Error('Stellar wallet not ready yet.');
      const { CavosStellar } = await import('@cavos/kit');
      await CavosStellar.recover({
        code,
        identity: wallet.identity,
        network: 'stellar-testnet',
        appSalt: 'cavos-super-wallet-2',
      });
      // After recovery the wallet instance is stale — the page triggers a reconnect.
    },
    [wallet],
  );

  const ready = status === 'ready';
  const blocked = status === 'needs-device-approval';
  const statusLabel = connectError
    ? 'Error'
    : ready
      ? 'Ready'
      : blocked
        ? 'Needs approval'
        : 'Connecting';

  const displayBalance = stroops != null ? formatUnits(stroops, STELLAR_DECIMALS) : '—';

  const tokens: TokenEntry[] = [
    {
      symbol: 'XLM',
      name: 'Stellar Lumens',
      balance: displayBalance,
      chain: 'stellar' as const,
    },
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
    onSetupRecovery,
    onRecover,
  };
}
