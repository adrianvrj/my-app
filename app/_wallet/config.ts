// Shared configuration for the multi-chain "super wallet".
//
// Both networks run on testnet so the same demo works end-to-end:
//   starknet → sepolia   ·   solana → devnet
import type { CavosConfig, CavosModalConfig } from '@cavos/kit/react';

const APP_ID = process.env.NEXT_PUBLIC_CAVOS_APP_ID || '';
const PAYMASTER_API_KEY = process.env.NEXT_PUBLIC_CAVOS_PAYMASTER_API_KEY || '';

// ── Starknet (Sepolia) ──────────────────────────────────────────────────────
export const STARKNET_RPC_URL = 'https://api.cartridge.gg/x/starknet/sepolia';

// Sepolia token addresses (18 decimals each).
export const STARKNET_TOKENS = [
  {
    symbol: 'STRK',
    decimals: 18,
    address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  },
  {
    symbol: 'ETH',
    decimals: 18,
    address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
  },
] as const;

export const starknetConfig: CavosConfig = {
  appId: APP_ID,
  chain: 'starknet',
  network: 'testnet', // → sepolia
  appSalt: 'cavos-super-wallet-5',
  paymasterApiKey: PAYMASTER_API_KEY,
  rpcUrl: STARKNET_RPC_URL,
};

// ── Solana (Devnet) ─────────────────────────────────────────────────────────
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com';

export const LAMPORTS_PER_SOL = 1_000_000_000;

export const solanaConfig: CavosConfig = {
  appId: APP_ID,
  chain: 'solana',
  network: 'testnet', // → solana-devnet
  appSalt: 'cavos-super-wallet-5',
  rpcUrl: SOLANA_RPC_URL, // your provider RPC (Alchemy/Helius); default public devnet fails from the browser
  // Gasless via the Cavos relayer (auto-configured from appId) — no paymaster key.
};

// ── Stellar (Testnet) ───────────────────────────────────────────────────────
export const STELLAR_RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_TESTNET_RPC_URL || 'https://soroban-testnet.stellar.org';

/** Native XLM has 7 decimals (stroops). */
export const STELLAR_DECIMALS = 7;

export const stellarConfig: CavosConfig = {
  appId: APP_ID,
  chain: 'stellar',
  network: 'testnet', // → stellar-testnet
  appSalt: 'cavos-super-wallet-5',
  rpcUrl: STELLAR_RPC_URL,
  // Gasless via the Cavos relayer (auto-configured from appId) — no paymaster key.
};

export const modal: CavosModalConfig = {
  appName: 'Cavos Super Wallet',
  theme: 'light',
  emailMode: 'otp',
};

// ── Shared formatting helpers ───────────────────────────────────────────────
const INDIGO = '#422CFB';
export { INDIGO };

const TEN = BigInt(10);

/** Format a raw integer balance (in base units) to a human string. */
export function formatUnits(raw: bigint, decimals: number, maxFrac = 4): string {
  const base = TEN ** BigInt(decimals);
  const whole = raw / base;
  const frac = raw % base;
  if (frac === BigInt(0)) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, maxFrac).replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

/** Parse a human decimal string to raw base units. */
export function parseUnits(value: string, decimals: number): bigint {
  const [whole = '0', frac = ''] = value.trim().split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * TEN ** BigInt(decimals) + BigInt(fracPadded || '0');
}

export function shorten(addr: string, lead = 6, tail = 4): string {
  if (!addr) return '';
  return addr.length <= lead + tail ? addr : `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}
