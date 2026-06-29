'use client';

import { useCallback, useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { InstructionData } from '@cavos/kit';
import { formatUnits, parseUnits, shorten } from './config';
import type { SolanaState } from './useSolana';
import type { ActivityItem } from './ui';
import type { TokenEntry } from './TokenList';
import type { SendToken } from './SendForm';

// Devnet USDC mint for SPL transfer demo via executeInstructions.
const DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GikXHaREu7R4edTGCoib2VEhKAg6';
const USDC_DECIMALS = 6;

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
  /** SPL token send via executeInstructions. */
  onSendSpl: (recipient: string, amount: string, symbol: string) => Promise<string>;
  onRefresh: () => void;
  /** Recovery: generate code and register backup signer. */
  onSetupRecovery: () => Promise<string>;
  /** Recovery: recover account with a code. */
  onRecover: (code: string) => Promise<void>;
}

export function useSolanaWallet(solana: SolanaState): SolanaWalletData {
  const { wallet, address, status, error: connectError } = solana;
  const [lamports, setLamports] = useState<bigint | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const refreshBalance = useCallback(async () => {
    if (!wallet || !address) return;
    setBalancesLoading(true);
    try {
      const bal = await wallet.connection.getBalance(new PublicKey(address));
      setLamports(BigInt(bal));
    } catch {
      /* non-fatal */
    } finally {
      setBalancesLoading(false);
    }
  }, [wallet, address]);

  useEffect(() => {
    if (status === 'ready') refreshBalance();
  }, [status, refreshBalance]);

  // ── Native SOL send (execute_transfer) ──
  const onSend = useCallback(
    async (recipient: string, amount: string, _symbol: string): Promise<string> => {
      if (!wallet) throw new Error('Solana wallet not ready yet.');
      const raw = parseUnits(amount || '0', 9);
      const signature = await wallet.execute(raw, recipient);
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
    [wallet, refreshBalance],
  );

  // ── SPL token send (executeInstructions) ──
  const onSendSpl = useCallback(
    async (recipient: string, amount: string, symbol: string): Promise<string> => {
      if (!wallet || !address) throw new Error('Solana wallet not ready yet.');

      const decimals = symbol === 'USDC' ? USDC_DECIMALS : 6;
      const mint = new PublicKey(DEVNET_USDC_MINT);
      const raw = parseUnits(amount || '0', decimals);

      const srcTokenAccount = getAssociatedTokenAddressSync(mint, new PublicKey(address), true);
      const destTokenAccount = getAssociatedTokenAddressSync(mint, new PublicKey(recipient), true);

      // SPL Token transfer_checked: discriminator(8) + amount(u64) + decimals(u8)
      const transferData = buildTransferCheckedData(raw, decimals);

      const instructions: InstructionData[] = [
        {
          programId: TOKEN_PROGRAM_ID.toBase58(),
          accounts: [
            { pubkey: srcTokenAccount.toBase58(), isSigner: true, isWritable: true },
            { pubkey: destTokenAccount.toBase58(), isSigner: false, isWritable: true },
            { pubkey: address, isSigner: true, isWritable: false }, // PDA authority (signed by CPI)
            { pubkey: mint.toBase58(), isSigner: false, isWritable: false },
          ],
          data: transferData,
        },
      ];

      const signature = await wallet.executeInstructions(instructions);
      setActivity((prev) => [
        {
          id: signature,
          kind: 'send',
          amount: formatUnits(raw, decimals),
          symbol: 'USDC',
          to: shorten(recipient),
          href: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
          ts: Date.now(),
        },
        ...prev,
      ]);
      return signature;
    },
    [wallet, address],
  );

  // ── Recovery ──
  const onSetupRecovery = useCallback(async (): Promise<string> => {
    if (!wallet) throw new Error('Solana wallet not ready yet.');
    // CavosSolana.setupRecovery generates + registers a backup signer.
    // The kit's useCavos().setupRecovery() does the same but wraps generateRecoveryCode().
    // Since SolanaPanel doesn't have access to useCavos, we use the wallet directly.
    const { generateRecoveryCode } = await import('@cavos/kit');
    const code = generateRecoveryCode();
    await wallet.setupRecovery(code);
    return code;
  }, [wallet]);

  const onRecover = useCallback(
    async (code: string) => {
      if (!wallet || !address) throw new Error('Solana wallet not ready yet.');
      // Use CavosSolana.recover to authorize a new device via backup key.
      const { CavosSolana } = await import('@cavos/kit');
      const identity = wallet.identity;
      await CavosSolana.recover({
        code,
        identity,
        network: 'solana-devnet',
        appSalt: 'cavos-super-wallet',
      });
      // After recovery, the wallet instance is stale — a reconnect is needed.
      // The caller (wallet page) should trigger a full reconnect.
    },
    [wallet, address],
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

  const displayBalance = lamports != null ? formatUnits(lamports, 9) : '—';

  const tokens: TokenEntry[] = [
    {
      symbol: 'SOL',
      name: 'Solana',
      balance: displayBalance,
      chain: 'solana' as const,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin (devnet)',
      balance: '—',
      chain: 'solana' as const,
    },
  ];

  const sendTokens: SendToken[] = [
    { symbol: 'SOL', decimals: 9, displayBalance },
    { symbol: 'USDC', decimals: USDC_DECIMALS, displayBalance: '—' },
  ];

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
    onSendSpl,
    onRefresh: refreshBalance,
    onSetupRecovery,
    onRecover,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the instruction data for SPL Token `transfer_checked`.
 * Layout: discriminator(8) + amount(u64 LE) + decimals(u8) = 17 bytes.
 * Discriminator = sha256("global:transfer_checked")[..8].
 */
function buildTransferCheckedData(amount: bigint, decimals: number): Uint8Array {
  const discriminator = new Uint8Array([
    0x77, 0xfa, 0xca, 0x18, 0xfd, 0x87, 0xf4, 0x79,
  ]);
  const amountBuf = new Uint8Array(8);
  new DataView(amountBuf.buffer).setBigUint64(0, amount, true);
  const data = new Uint8Array(8 + 8 + 1);
  data.set(discriminator, 0);
  data.set(amountBuf, 8);
  data[16] = decimals;
  return data;
}
