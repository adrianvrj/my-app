'use client';

import { RevokeDevicePage } from '@cavos/kit/react';
import { solanaConfig, starknetConfig, stellarConfig } from '../_wallet/config';

export default function Page() {
  return <RevokeDevicePage configs={[starknetConfig, solanaConfig, stellarConfig]} />;
}
