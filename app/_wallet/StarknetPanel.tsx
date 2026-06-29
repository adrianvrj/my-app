'use client';

import { useCallback, useEffect, useState } from 'react';
import { RpcProvider } from 'starknet';
import { useCavos } from '@cavos/kit/react';
import {
  STARKNET_RPC_URL,
  STARKNET_TOKENS,
  formatUnits,
  parseUnits,
  shorten,
} from './config';
import type { ActivityItem } from './ui';
import type { TokenEntry } from './TokenList';
import type { SendToken } from './SendForm';

const rpc = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
type Balances = Record<string, bigint>;

export interface StarknetWalletData {
  address: string | null;
  network: string;
  ready: boolean;
  blocked: boolean;
  statusLabel: string;
  tokens: TokenEntry[];
  sendTokens: SendToken[];
  balancesLoading: boolean;
  activity: ActivityItem[];
  onSend: (recipient: string, amount: string, symbol: string) => Promise<string>;
  onRefresh: () => void;
}

export function useStarknetWallet(): StarknetWalletData {
  const { address, walletStatus, execute } = useCavos();
  const [balances, setBalances] = useState<Balances>({});
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const refreshBalances = useCallback(async () => {
    if (!address) return;
    setBalancesLoading(true);
    try {
      const next: Balances = {};
      await Promise.all(
        STARKNET_TOKENS.map(async (t) => {
          const res = await rpc.callContract({
            contractAddress: t.address,
            entrypoint: 'balanceOf',
            calldata: [address],
          });
          const [low = '0', high = '0'] = res as string[];
          next[t.address] = (BigInt(high) << BigInt(128)) + BigInt(low);
        }),
      );
      setBalances(next);
    } catch {
      /* balance read failure is non-fatal; UI shows dashes */
    } finally {
      setBalancesLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) refreshBalances();
  }, [address, refreshBalances]);

  const u256Calldata = (raw: bigint) => {
    const MASK = (BigInt(1) << BigInt(128)) - BigInt(1);
    return [(raw & MASK).toString(), (raw >> BigInt(128)).toString()];
  };

  const onSend = useCallback(
    async (recipient: string, amount: string, symbol: string): Promise<string> => {
      const token = STARKNET_TOKENS.find((t) => t.symbol === symbol) ?? STARKNET_TOKENS[0];
      const rawAmount = parseUnits(amount || '0', token.decimals);
      const res = await execute([
        {
          contractAddress: token.address,
          entrypoint: 'transfer',
          calldata: [recipient, ...u256Calldata(rawAmount)],
        },
      ]);
      setActivity((prev) => [
        {
          id: res.transactionHash,
          kind: 'send',
          amount: formatUnits(rawAmount, token.decimals),
          symbol: token.symbol,
          to: shorten(recipient),
          href: `https://sepolia.voyager.online/tx/${res.transactionHash}`,
          ts: Date.now(),
        },
        ...prev,
      ]);
      rpc.waitForTransaction(res.transactionHash).then(refreshBalances).catch(() => {});
      return res.transactionHash;
    },
    [execute, refreshBalances],
  );

  const blocked = walletStatus.needsDeviceApproval;
  const ready = walletStatus.isReady && !blocked;
  const statusLabel = blocked ? 'Needs approval' : walletStatus.isReady ? 'Ready' : 'Deploying';

  const TOKEN_NAMES: Record<string, string> = {
    STRK: 'Starknet Token',
    ETH: 'Ether',
  };

  const tokens: TokenEntry[] = STARKNET_TOKENS.map((t) => ({
    symbol: t.symbol,
    name: TOKEN_NAMES[t.symbol] ?? t.symbol,
    balance:
      balances[t.address] != null ? formatUnits(balances[t.address], t.decimals) : '—',
    chain: 'starknet' as const,
  }));

  const sendTokens: SendToken[] = STARKNET_TOKENS.map((t) => ({
    symbol: t.symbol,
    decimals: t.decimals,
    displayBalance:
      balances[t.address] != null ? formatUnits(balances[t.address], t.decimals) : '—',
  }));

  return {
    address,
    network: 'Sepolia',
    ready,
    blocked,
    statusLabel,
    tokens,
    sendTokens,
    balancesLoading,
    activity,
    onSend,
    onRefresh: refreshBalances,
  };
}
