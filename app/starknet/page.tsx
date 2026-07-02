'use client';

import { CavosProvider } from '@cavos/kit/react';
import { starknetConfig, modal } from '../_wallet/config';
import { WalletApp } from '../_wallet/WalletApp';

export default function StarknetWalletPage() {
  return (
    <CavosProvider config={starknetConfig} modal={modal}>
      <WalletApp chain="starknet" />
    </CavosProvider>
  );
}
