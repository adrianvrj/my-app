'use client';

import { ApproveDevicePage } from '@cavos/kit/react';
import { solanaConfig, starknetConfig, stellarConfig } from '../_wallet/config';

export default function Page() {
  return <ApproveDevicePage configs={[starknetConfig, solanaConfig, stellarConfig]} />;
}
