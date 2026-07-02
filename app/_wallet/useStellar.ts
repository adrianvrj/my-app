'use client';

import { useEffect, useRef, useState } from 'react';
import { CavosStellar } from '@cavos/kit';
import { STELLAR_RPC_URL } from './config';

const APP_ID = process.env.NEXT_PUBLIC_CAVOS_APP_ID || '';
const APP_SALT = 'cavos-super-wallet-2';

export type StellarStatus =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'needs-device-approval'
  | 'error';

export interface StellarState {
  wallet: CavosStellar | null;
  address: string | null;
  status: StellarStatus;
  error: string | null;
}

/**
 * Derive the Stellar (Soroban) device-account from the same shared OAuth identity
 * as Starknet and Solana. One login → three chains: the identity is chain-
 * agnostic, only the address space differs. Gasless via the Cavos relayer (appId).
 */
export function useStellar(userId: string | null | undefined): StellarState {
  const [state, setState] = useState<StellarState>({
    wallet: null,
    address: null,
    status: 'idle',
    error: null,
  });
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

    CavosStellar.connect({
      network: 'stellar-testnet',
      identity: { userId },
      appSalt: APP_SALT,
      appId: APP_ID,
      rpcUrl: STELLAR_RPC_URL,
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
