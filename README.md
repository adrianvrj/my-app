# Cavos every-chain demo

Reference Next.js application for `@cavos/kit`. It demonstrates one embedded
wallet experience across Cavos' current Starknet, Solana, and Stellar adapters.
The product direction is every chain; this demo only labels an adapter available
after it is implemented and validated.

## What it demonstrates

- Hosted Google, Apple, and email authentication.
- Deterministic, self-custodial wallets with device-native authority.
- Chain switching without changing the authentication model.
- Sponsored execution through each chain's supported gas model.
- Multi-device approval, passkeys, recovery, balances, send, and receive flows.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure at minimum:

```env
NEXT_PUBLIC_CAVOS_APP_ID=
NEXT_PUBLIC_CAVOS_PAYMASTER_API_KEY=
NEXT_PUBLIC_CAVOS_ENVIRONMENT=development
```

The paymaster key is used by the Starknet demo. Solana and Stellar use the
hosted relayer associated with the App ID. The current Starknet web SDK receives
this value client-side, so use only an app/environment-scoped key with origin,
rate, and spend restrictions. Never place an operator, admin, or treasury
credential in `NEXT_PUBLIC_`.

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Purpose |
|---|---|
| `/` | Unified wallet shell and chain selector. |
| `/starknet` | Starknet Sepolia wallet and token actions. |
| `/solana` | Solana Devnet wallet and SOL actions. |
| `/stellar` | Stellar Testnet wallet, XLM, and contract actions. |
| `/approve-device` | Self-hosted new-device approval flow. |

Shared chain configuration lives in `app/_wallet/config.ts`. Each page mounts
the same `@cavos/kit/react` provider with a different `chain` value.

## Local SDK wiring

This app consumes a packed local `@cavos/kit` tarball. After changing the SDK:

```bash
cd ../kit
npm run build
npm pack
```

Then update the `file:` dependency in this app's `package.json`, reinstall, and
run the build again.

## Validate

```bash
npm run lint
npm run build
```

## Test hardware-isolated social recovery

This example pins the production Cavos Confidential Space measurement while it
uses the Cavos `development` environment. That environment exposes Google as
its only recovery provider and has no recovery delay.

1. Open `/starknet`, `/solana`, or `/stellar` and sign in with Google.
2. Keep the modal open while the first sign-in enrolls the chain-specific
   recovery authority through the attested workload.
3. Open the same route in a private window, another browser, or another device.
4. Sign in with the same Google account. The SDK restores the new device without
   a passkey, recovery phrase, or approval from the original device.

Run the first enrollment separately on each chain. The Google identity is the
same, but every chain has its own wallet and recovery record.

## Documentation

- [Cavos docs](https://docs.cavos.xyz)
- [Cavos dashboard](https://cavos.xyz/dashboard)
