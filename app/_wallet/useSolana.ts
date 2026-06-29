'use client';

import { useEffect, useRef, useState } from 'react';
import { CavosSolana } from '@cavos/kit';
import { SOLANA_RPC_URL } from './config';

const APP_ID = process.env.NEXT_PUBLIC_CAVOS_APP_ID || '';
const APP_SALT = 'cavos-super-wallet';

export type SolanaStatus =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'needs-device-approval'
  | 'error';

export interface SolanaState {
  wallet: CavosSolana | null;
  address: string | null;
  status: SolanaStatus;
  error: string | null;
}

/**
 * Derive the Solana device-account from a shared OAuth identity (the same
 * `userId` the Starknet CavosProvider resolved at login). One login → both
 * chains: the identity is chain-agnostic, only the address space differs.
 */
export function useSolana(userId: string | null | undefined): SolanaState {
  const [state, setState] = useState<SolanaState>({
    wallet: null,
    address: null,
    status: 'idle',
    error: null,
  });
  // Guard against re-connecting for an identity we already resolved.
  const connectedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      connectedFor.current = null;
      setState({ wallet: null, address: null, status: 'idle', error: null });
      return;
    }
    if (connectedFor.current === userId) return;
    connectedFor.current = userId;

    let cancelled = false;
    setState((s) => ({ ...s, status: 'connecting', error: null }));

    CavosSolana.connect({
      network: 'solana-devnet',
      identity: { userId },
      appSalt: APP_SALT,
      appId: APP_ID,
      rpcUrl: SOLANA_RPC_URL,
    })
      .then((wallet) => {
        if (cancelled) return;
        setState({
          wallet,
          address: wallet.address,
          status: wallet.status === 'ready' ? 'ready' : 'needs-device-approval',
          error: null,
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        connectedFor.current = null; // allow a retry
        setState({ wallet: null, address: null, status: 'error', error: (e as Error).message });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}
