'use client';

import { CavosProvider } from '@cavos/kit/react';
import { solanaConfig, modal } from '../_wallet/config';
import { WalletApp } from '../_wallet/WalletApp';

export default function SolanaWalletPage() {
  return (
    <CavosProvider config={solanaConfig} modal={modal}>
      <WalletApp chain="solana" />
    </CavosProvider>
  );
}
