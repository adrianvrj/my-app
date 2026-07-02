'use client';

import { CavosProvider } from '@cavos/kit/react';
import { stellarConfig, modal } from '../_wallet/config';
import { WalletApp } from '../_wallet/WalletApp';

export default function StellarWalletPage() {
  return (
    <CavosProvider config={stellarConfig} modal={modal}>
      <WalletApp chain="stellar" />
    </CavosProvider>
  );
}
