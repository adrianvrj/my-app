'use client';

import { CavosProvider, SessionKeyPolicy } from '@cavos/react';

const SESSION_POLICY: SessionKeyPolicy = {
  allowedContracts: [
    '0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D', // STRK token
  ],
  spendingLimits: [
    {
      token: '0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D',
      limit: BigInt('10000000000000000000'), // 10 STRK
    },
  ],
  maxCallsPerTx: 5,
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CavosProvider
      config={{
        appId: process.env.NEXT_PUBLIC_CAVOS_APP_ID || '',
        network: 'mainnet',
        paymasterApiKey: process.env.NEXT_PUBLIC_CAVOS_PAYMASTER_API_KEY || '',
        enableLogging: true,
        session: {
          defaultPolicy: SESSION_POLICY,
        },
        slot: {
          rpcUrl: 'https://api.cartridge.gg/x/cavos/katana',
          chainId: '0x57505f4341564f53', // WP_CAVOS - the actual internal get_tx_info().chain_id of this Slot
        },
      }}
      modal={{ appName: 'Cavos Demo', theme: 'dark' }}
    >
      {children}
    </CavosProvider>
  );
}
