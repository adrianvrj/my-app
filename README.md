# Cavos Example App

A complete example application demonstrating how to integrate the Cavos SDK for non-custodial wallet authentication in a Next.js application.

## What is Cavos?

Cavos enables users to log in with familiar OAuth providers (Google, Apple) and get a blockchain wallet instantly. No seed phrases, no complex setup - just secure, hardware-backed passkey authentication.

## Features Demonstrated

- OAuth authentication (Google & Apple)
- Passkey-based wallet creation
- Gasless transactions
- Token approval flow
- Session management
- Multi-page navigation

## Prerequisites

Before you begin, you need:

1. **Node.js 16+** installed
2. **A Cavos account** at [cavos.xyz](https://cavos.xyz)
3. **Your App ID** from the Cavos dashboard

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd cavos-example-app
npm install
```

### 2. Configure Your App ID

Open `app/layout.tsx` and replace the `appId` with your own:

```tsx
<CavosProvider
  config={{
    appId: 'your-app-id-here', // Get this from cavos.xyz/dashboard
    network: 'sepolia',
  }}
>
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
cavos-example-app/
├── app/
│   ├── layout.tsx          # Root layout with CavosProvider
│   ├── page.tsx            # Main page with wallet info
│   └── test/
│       ├── page.tsx        # Test page entry point
│       └── test.tsx        # Token approval demo
├── public/
│   ├── cavos-black.png     # Cavos logo
│   └── CavosLogo.png       # Cavos logo variant
└── README.md
```

## How It Works

### Step 1: User Authentication

Users click "Login with Google" or "Login with Apple":

```tsx
const { login } = useCavos();

<button onClick={() => login('google')}>
  Login with Google
</button>
```

### Step 2: Passkey Creation

After OAuth, users create a passkey using their device's biometric authentication (FaceID, TouchID, Windows Hello). This happens automatically via a modal.

### Step 3: Wallet Deployment

The wallet is automatically deployed on-chain (gasless) and ready to use.

### Step 4: Execute Transactions

Send gasless transactions:

```tsx
const { execute } = useCavos();

await execute({
  contractAddress: '0x...',
  entrypoint: 'transfer',
  calldata: ['0x...', '1000'],
}, { gasless: true });
```

## Key Concepts

### Non-Custodial Security

- Private keys are generated on the user's device
- Keys are encrypted using hardware-backed passkeys (WebAuthn PRF)
- Backend only stores encrypted data
- Decryption happens only on the client with biometric auth

### Session Management

- Wallet is cached in `sessionStorage` during browser session
- No repeated passkey prompts when navigating or refreshing
- Cache clears when browser/tab closes or user logs out

### Gasless Transactions

- Cavos provides a shared paymaster for Sepolia testnet
- Users can transact without holding ETH
- Perfect for onboarding new users

## Pages Overview

### Main Page (`/`)

Demonstrates:
- User authentication
- Wallet address display
- Token approval transaction
- Logout functionality

### Test Page (`/test`)

Demonstrates:
- Custom spender address input
- Custom amount input
- Transaction submission
- Transaction hash display with Starkscan link

## API Reference

### `useCavos()` Hook

```tsx
const {
  // Authentication
  isAuthenticated,
  user,
  login,
  logout,
  
  // Wallet
  address,
  createWallet,
  requiresWalletCreation,
  
  // Transactions
  execute,
  
  // State
  isLoading,
  cavos, // Direct SDK access
} = useCavos();
```

### Configuration Options

```tsx
<CavosProvider
  config={{
    appId: string;              // Required: Your Cavos App ID
    network?: 'mainnet' | 'sepolia'; // Optional: Default 'sepolia'
    starknetRpcUrl?: string;    // Optional: Custom RPC URL
    paymasterApiKey?: string;   // Optional: Custom paymaster key
    enableLogging?: boolean;    // Optional: Enable debug logs
  }}
>
```

## Common Tasks

### Adding a New Page

1. Create a new directory in `app/`
2. Add `page.tsx` file
3. Use the `useCavos()` hook to access wallet functionality

### Customizing the UI

The app uses Tailwind CSS. Modify classes in component files or update `tailwind.config.ts` for global changes.

### Changing Networks

Update the `network` prop in `app/layout.tsx`:

```tsx
config={{
  appId: 'your-app-id',
  network: 'mainnet', // or 'sepolia'
}}
```

## Troubleshooting

### Passkey Prompt on Every Page Load

**Solution**: Make sure you're using SDK version 0.1.1 or higher, which includes session caching.

### Transaction Fails

**Possible causes**:
- Wallet not deployed (should auto-deploy)
- Invalid contract address or calldata
- Network mismatch

**Check console logs** for detailed error messages.

### OAuth Redirect Not Working

**Ensure**:
- Your App ID is correct
- Redirect URIs are configured in Cavos dashboard
- You're running on `localhost:3000` or a configured domain

## Learn More

- [Cavos Documentation](https://docs.cavos.xyz)
- [Cavos SDK GitHub](https://github.com/cavos/react)
- [Starknet Documentation](https://docs.starknet.io)

## Support

- Email: [support@cavos.xyz](mailto:support@cavos.xyz)
- Discord: [Join our community](https://discord.gg/cavos)
- Documentation: [docs.cavos.xyz](https://docs.cavos.xyz)

## License

MIT
