'use client';

import {
  useCavos,
  JwtExpiredError,
} from '@cavos/react';
import { useState, useEffect, useCallback } from 'react';
import { RpcProvider, uint256, typedData, CallData } from 'starknet';
import Image from 'next/image';
import Link from 'next/link';

// Sepolia RPC — matches the network configured in providers.tsx
const provider = new RpcProvider({
  nodeUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/dql5pMT88iueZWl7L0yzT56uVk0EBU4L',
});

// STRK token (mainnet — allowed by session policy)
const TOKEN_ADDRESS = '0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D';

// ETH token (NOT in session policy — demonstrates policy enforcement)
const ETH_ADDRESS = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';

// Force dynamic rendering to prevent SSR from trying to parse auth_data
export const dynamic = 'force-dynamic';

export default function Home() {
  const {
    isAuthenticated,
    user,
    address,
    logout,
    isLoading: sdkLoading,
    execute,
    deployAccount,
    getBalance,
    walletStatus,
    signMessage,
    renewSession,
    revokeSession,
    emergencyRevokeAllSessions,
    registerCurrentSession,
    sessionPublicKey,
    openModal,
  } = useCavos();

  const [txCount, setTxCount] = useState(0);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [balance, setBalance] = useState<string>('0');
  const [strkBalance, setStrkBalance] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureResult, setSignatureResult] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isEmergencyRevoking, setIsEmergencyRevoking] = useState(false);
  const [isRegisteringSession, setIsRegisteringSession] = useState(false);

  // Transfer state
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-9), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Classify errors — surface JWT expiry clearly so users know to re-login
  const handleError = useCallback((err: unknown, context: string) => {
    const e = err as Error;
    if (err instanceof JwtExpiredError) {
      setError('Your session has expired. Please sign out and log in again.');
      addLog(`${context}: session expired — re-login required`);
    } else {
      setError(e.message || `${context} failed`);
      addLog(`Error (${context}): ${e.message}`);
    }
    console.error(`[App] ${context}:`, err);
  }, [addLog]);

  // Log wallet status changes
  useEffect(() => {
    if (walletStatus.isDeploying) addLog('Deploying account...');
    if (walletStatus.isRegistering) addLog('Registering session...');
    if (walletStatus.isReady && !walletStatus.isDeploying && !walletStatus.isRegistering) {
      addLog('Wallet ready!');
    }
  }, [walletStatus.isDeploying, walletStatus.isRegistering, walletStatus.isReady, addLog]);

  // Sync balances periodically
  useEffect(() => {
    if (!isAuthenticated || !address) return;

    let cancelled = false;

    const syncBalances = async () => {
      if (cancelled) return;
      try {
        const [bal, strkResult] = await Promise.all([
          getBalance(),
          provider.callContract({
            contractAddress: TOKEN_ADDRESS,
            entrypoint: 'balanceOf',
            calldata: [address],
          }),
        ]);
        if (cancelled) return;
        setBalance((Number(bal) / 1e18).toFixed(4));
        const strkBal = uint256.uint256ToBN({ low: strkResult[0], high: strkResult[1] });
        setStrkBalance((Number(strkBal) / 1e18).toFixed(4));
      } catch (e) {
        if (!cancelled) console.error('[App] Balance sync error:', e);
      }
    };

    syncBalances();
    const interval = setInterval(syncBalances, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isAuthenticated, address, getBalance]);

  // ─── Transaction handlers ────────────────────────────────────────────────────

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    const txNum = txCount + 1;
    addLog(`Executing tx #${txNum}...`);
    try {
      const hash = await execute({
        contractAddress: TOKEN_ADDRESS,
        entrypoint: 'approve',
        calldata: [address || '', '1000000000000000000', '0'],
      });
      setTxCount(txNum);
      setLastTxHash(hash);
      addLog(`Tx #${txNum} sent: ${hash.slice(0, 20)}...`);
      // Receipt check (non-blocking — SDK already confirmed submission)
      provider.waitForTransaction(hash).then((receipt) => {
        const r = receipt as Record<string, unknown>;
        const status = r.execution_status as string;
        const revert = r.revert_reason as string;
        addLog(`Tx #${txNum}: ${status}${revert ? ' — ' + revert : ''}`);
      }).catch((e: Error) => addLog(`Tx #${txNum} receipt: ${e.message}`));
    } catch (err) {
      handleError(err, 'Execute');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteNonGasless = async () => {
    setIsExecuting(true);
    setError(null);
    const txNum = txCount + 1;
    addLog(`Executing non-gasless tx #${txNum} (user pays fees)...`);
    try {
      const hash = await execute(
        {
          contractAddress: TOKEN_ADDRESS,
          entrypoint: 'approve',
          calldata: [address || '', '1000000000000000000', '0'],
        },
        { gasless: false }
      );
      setTxCount(txNum);
      setLastTxHash(hash);
      addLog(`Non-gasless tx #${txNum} sent: ${hash.slice(0, 20)}...`);
      provider.waitForTransaction(hash).then((receipt) => {
        const r = receipt as Record<string, unknown>;
        const status = r.execution_status as string;
        const revert = r.revert_reason as string;
        addLog(`Tx #${txNum}: ${status}${revert ? ' — ' + revert : ''}`);
      }).catch((e: Error) => addLog(`Tx #${txNum} receipt: ${e.message}`));
    } catch (err) {
      handleError(err, 'Non-gasless execute');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleBlockedExecute = async () => {
    setIsExecuting(true);
    setError(null);
    addLog('Attempting tx to unauthorized contract (ETH)...');
    try {
      const hash = await execute({
        contractAddress: ETH_ADDRESS,
        entrypoint: 'approve',
        calldata: [address || '', '1000000000000000000', '0'],
      });
      addLog(`Tx sent: ${hash.slice(0, 20)}...`);
      provider.waitForTransaction(hash).then((receipt) => {
        const r = receipt as Record<string, unknown>;
        addLog(`ETH tx: ${r.execution_status}${r.revert_reason ? ' — ' + r.revert_reason : ''}`);
      }).catch((e: Error) => addLog(`ETH tx receipt: ${e.message}`));
    } catch (err) {
      handleError(err, 'Blocked tx');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount) return;
    setIsTransferring(true);
    setError(null);
    addLog(`Transferring ${transferAmount} STRK to ${transferTo.slice(0, 10)}...`);
    try {
      const amountWei = BigInt(Math.floor(parseFloat(transferAmount) * 1e18));
      const mask128 = (BigInt(1) << BigInt(128)) - BigInt(1);
      const hash = await execute({
        contractAddress: TOKEN_ADDRESS,
        entrypoint: 'transfer',
        calldata: [transferTo, (amountWei & mask128).toString(), (amountWei >> BigInt(128)).toString()],
      });
      setTxCount(prev => prev + 1);
      setLastTxHash(hash);
      addLog(`Transfer sent: ${hash.slice(0, 20)}...`);
      provider.waitForTransaction(hash).then((receipt) => {
        const r = receipt as Record<string, unknown>;
        addLog(`Transfer: ${r.execution_status}${r.revert_reason ? ' — ' + r.revert_reason : ''}`);
        setTransferTo('');
        setTransferAmount('');
      }).catch((e: Error) => addLog(`Transfer receipt: ${e.message}`));
    } catch (err) {
      handleError(err, 'Transfer');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDeploy = async () => {
    addLog('Deploying account...');
    try {
      const hash = await deployAccount();
      addLog(`Deployment submitted: ${hash}`);
    } catch (err) {
      handleError(err, 'Deploy');
    }
  };

  // ─── Session handlers ─────────────────────────────────────────────────────────

  const handleSignMessage = async () => {
    setIsSigning(true);
    setError(null);
    setSignatureResult(null);
    addLog('Signing message...');
    try {
      const signature = await signMessage({
        types: {
          StarkNetDomain: [
            { name: 'name', type: 'shortstring' },
            { name: 'version', type: 'shortstring' },
          ],
          Message: [{ name: 'content', type: 'felt' }],
        },
        primaryType: 'Message',
        domain: { name: 'CavosApp', version: '1' },
        message: { content: '0x48656c6c6f20576f726c64' }, // "Hello World"
      });
      const sigStr = `r: ${signature[1]?.slice(0, 20)}..., s: ${signature[2]?.slice(0, 20)}...`;
      setSignatureResult(sigStr);
      const msgHash = typedData.getMessageHash({
        types: {
          StarkNetDomain: [{ name: 'name', type: 'shortstring' }, { name: 'version', type: 'shortstring' }],
          Message: [{ name: 'content', type: 'felt' }],
        },
        primaryType: 'Message',
        domain: { name: 'CavosApp', version: '1' },
        message: { content: '0x48656c6c6f20576f726c64' },
      } as any, address!);
      console.log('Message hash:', msgHash);
      console.log('signature[0] (magic):', signature[0]);
      console.log('signature[1] (r):', signature[1]);
      console.log('signature[2] (s):', signature[2]);
      console.log('signature[3] (session_key):', signature[3]);
      addLog(`Signed: ${sigStr}`);
    } catch (err) {
      handleError(err, 'Sign message');
    } finally {
      setIsSigning(false);
    }
  };

  const THE_TYPED_DATA = {
    types: {
      StarkNetDomain: [
        { name: 'name', type: 'shortstring' },
        { name: 'version', type: 'shortstring' },
      ],
      Message: [{ name: 'content', type: 'felt' }],
    },
    primaryType: 'Message',
    domain: { name: 'CavosApp', version: '1' },
    message: { content: '0x48656c6c6f20576f726c64' },
  } as const;

  const handleVerifyOnChain = async () => {
    if (!address) return;
    setIsVerifying(true);
    setVerifyResult(null);
    addLog('Signing and verifying on-chain...');
    try {
      // 1. Sign
      const signature = await signMessage(THE_TYPED_DATA as any);

      // 2. Compute the same message hash starknet.js uses
      const msgHash = typedData.getMessageHash(THE_TYPED_DATA as any, address);
      addLog(`Message hash: ${msgHash.slice(0, 20)}...`);
      addLog(`Signature: [${signature.map(s => s.slice(0, 10)).join(', ')}...]`);

      // 3. Call is_valid_signature on the account contract
      const result = await provider.callContract({
        contractAddress: address,
        entrypoint: 'is_valid_signature',
        calldata: CallData.compile({
          hash: msgHash,
          signature: signature,
        }),
      });

      // is_valid_signature returns VALIDATED = 'VALID' as felt252
      const returnVal = result[0];
      // Starknet VALIDATED = shortstring 'VALID' = 0x56414c4944
      const isValid = returnVal === '0x56414c4944';
      addLog(`is_valid_signature returned: ${returnVal}`);
      setVerifyResult({
        valid: isValid,
        message: isValid ? `✓ VALID — contract returned ${returnVal}` : `✗ INVALID — contract returned ${returnVal}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Verify error: ${msg}`);
      setVerifyResult({ valid: false, message: `Error: ${msg}` });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegisterSession = async () => {
    setIsRegisteringSession(true);
    setError(null);
    addLog('Registering session on-chain...');
    try {
      // SDK now awaits tx confirmation internally — no extra waitForTransaction needed
      const hash = await registerCurrentSession();
      addLog(`Session registered: ${hash.slice(0, 20)}...`);
    } catch (err) {
      handleError(err, 'Register session');
    } finally {
      setIsRegisteringSession(false);
    }
  };

  const handleRenewSession = async () => {
    setIsRenewing(true);
    setError(null);
    addLog('Renewing session key...');
    try {
      const hash = await renewSession();
      addLog(`Session renewed: ${hash.slice(0, 20)}...`);
    } catch (err) {
      handleError(err, 'Renew session');
    } finally {
      setIsRenewing(false);
    }
  };

  const handleRevokeSession = async () => {
    if (!sessionPublicKey) return;
    setIsRevoking(true);
    setError(null);
    addLog(`Revoking session ${sessionPublicKey.slice(0, 10)}...`);
    try {
      const hash = await revokeSession(sessionPublicKey);
      addLog(`Session revoked: ${hash.slice(0, 20)}...`);
    } catch (err) {
      handleError(err, 'Revoke session');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleEmergencyRevoke = async () => {
    setIsEmergencyRevoking(true);
    setError(null);
    addLog('EMERGENCY: Revoking ALL sessions...');
    try {
      const hash = await emergencyRevokeAllSessions();
      addLog(`All sessions revoked: ${hash.slice(0, 20)}...`);
    } catch (err) {
      handleError(err, 'Emergency revoke');
    } finally {
      setIsEmergencyRevoking(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setTxCount(0);
    setLastTxHash(null);
    setLogs([]);
    setIsMobileMenuOpen(false);
    setSignatureResult(null);
    setError(null);
  };

  // ─── Wallet status helpers ───────────────────────────────────────────────────

  const walletStatusLabel = walletStatus.isDeploying ? 'Deploying...'
    : walletStatus.isRegistering ? 'Registering...'
    : walletStatus.isReady ? 'Ready'
    : walletStatus.isDeployed ? 'Session expired — re-login'
    : 'Pending';

  const walletStatusColor = walletStatus.isReady ? 'bg-white'
    : (walletStatus.isDeploying || walletStatus.isRegistering) ? 'bg-white/50 animate-pulse'
    : 'bg-white/30';

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (sdkLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent" />
          <p className="mt-4 text-black/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row text-black">

      {/* Mobile top bar */}
      {isAuthenticated && (
        <div className="md:hidden fixed top-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md z-40 border-b border-gray-100 flex justify-between items-center">
          <Image src="/cavos-black.png" alt="Cavos" width={80} height={32} className="h-6 w-auto" />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-black">
            {isMobileMenuOpen
              ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            }
          </button>
        </div>
      )}

      {/* Sidebar */}
      {isAuthenticated && (
        <>
          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileMenuOpen(false)} />
          )}
          <aside className={`
            bg-black text-white p-6 flex flex-col h-screen overflow-y-auto
            fixed md:sticky top-0 left-0 z-50 transition-transform duration-300 ease-in-out w-80
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <div className="mb-8 hidden md:block">
              <Image src="/cavos-black.png" alt="Cavos" width={100} height={40} className="h-8 w-auto filter invert" />
            </div>
            <div className="md:hidden mb-8 flex justify-between items-center">
              <Image src="/cavos-black.png" alt="Cavos" width={100} height={40} className="h-8 w-auto filter invert" />
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-white">&#x2715;</button>
            </div>

            <div className="flex-1 space-y-8">
              {/* Account */}
              <div>
                <p className="text-xs text-white/50 uppercase tracking-widest mb-2 font-medium">Account</p>
                <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                  <p className="text-xs font-mono text-white/90 break-all mb-1">{address}</p>
                  {user?.email && <p className="text-xs text-white/50">{user.email}</p>}
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs text-white/50 uppercase tracking-widest mb-2 font-medium">Status</p>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3 border border-white/10">
                  <span className={`w-2 h-2 rounded-full ${walletStatusColor}`} />
                  <span className="text-sm font-medium">{walletStatusLabel}</span>
                </div>
                {/* Pending deploy tx — show explorer link for timeout recovery */}
                {walletStatus.pendingDeployTxHash && (
                  <a
                    href={`https://voyager.online/tx/${walletStatus.pendingDeployTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-xs text-white/50 hover:text-white/80 underline break-all"
                  >
                    Pending deploy tx &nearr;
                  </a>
                )}
              </div>

              {/* Balances */}
              <div>
                <p className="text-xs text-white/50 uppercase tracking-widest mb-2 font-medium">Balances</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white/10 rounded-lg p-3 border border-white/10">
                    <span className="text-sm text-white/70">STRK</span>
                    <span className="text-sm font-mono font-medium">{strkBalance}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/10 rounded-lg p-3 border border-white/10">
                    <span className="text-sm text-white/70">ETH</span>
                    <span className="text-sm font-mono font-medium">{balance}</span>
                  </div>
                </div>
              </div>

              {/* Transactions */}
              <div>
                <p className="text-xs text-white/50 uppercase tracking-widest mb-2 font-medium">Transactions</p>
                <p className="text-4xl font-light text-white">{txCount}</p>
              </div>

              {/* Navigation */}
              <div>
                <p className="text-xs text-white/50 uppercase tracking-widest mb-2 font-medium">Pages</p>
                <Link
                  href="/slot"
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
                >
                  <span>⚡</span>
                  <span>Slot Chain</span>
                </Link>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
            >
              &larr; Sign Out
            </button>
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-8 pt-24 md:pt-8 w-full">
        {!isAuthenticated ? (
          // ── Login view ────────────────────────────────────────────────────────
          <div className="text-center max-w-md w-full">
            <h1 className="text-4xl font-bold text-black mb-4">OAuth Wallet</h1>
            <p className="text-black/60 mb-8 text-lg">
              Self-custodial Starknet wallet powered by your Google account.
              <br /><span className="text-sm">No passkeys, no seed phrases, pure OAuth.</span>
            </p>

            <button
              onClick={openModal}
              className="w-full flex items-center justify-center gap-3 bg-black text-white px-6 py-4 rounded-full font-medium hover:bg-black/80 transition-all shadow-sm"
            >
              Connect Wallet
            </button>

          </div>
        ) : (
          // ── Authenticated view ────────────────────────────────────────────────
          <div className="w-full max-w-3xl">
            <h1 className="text-4xl font-bold text-black mb-2">Ready to Transact</h1>
            <p className="text-black/60 mb-12 text-lg">
              Your OAuth session is active. All transactions are gasless and verified on-chain.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">

              {/* Transfer STRK */}
              <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-black transition-colors relative overflow-hidden md:col-span-2">
                <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-sm">TRANSFER</div>
                <h2 className="text-xl font-bold mb-2">Transfer STRK</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Send STRK tokens. Balance: <span className="font-mono font-medium text-black">{strkBalance} STRK</span>
                </p>
                <div className="space-y-3 mb-4">
                  <input
                    type="text"
                    value={transferTo}
                    onChange={e => setTransferTo(e.target.value)}
                    placeholder="Recipient address (0x...)"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-black font-mono text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                  <input
                    type="text"
                    value={transferAmount}
                    onChange={e => setTransferAmount(e.target.value)}
                    placeholder="Amount (e.g. 0.1)"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-black font-mono text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
                <button
                  onClick={handleTransfer}
                  disabled={isTransferring || !walletStatus.isReady || !transferTo || !transferAmount}
                  className="w-full bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
                >
                  {isTransferring ? 'Transferring...' : 'Send STRK'}
                </button>
              </div>

              {/* Approve STRK */}
              <div className="bg-white border text-black border-gray-200 rounded-2xl p-8 hover:border-black transition-colors relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-sm">GASLESS</div>
                <h2 className="text-xl font-bold mb-2">Approve STRK</h2>
                <p className="text-sm text-gray-500 mb-6 font-mono break-all">Token: {TOKEN_ADDRESS.slice(0, 10)}...</p>
                <button
                  onClick={handleExecute}
                  disabled={isExecuting || !walletStatus.isReady}
                  className="w-full bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
                >
                  {isExecuting ? 'Executing...'
                    : walletStatus.isDeploying ? 'Deploying...'
                    : walletStatus.isRegistering ? 'Registering session...'
                    : 'Send Transaction'}
                </button>
                {!walletStatus.isReady && (
                  <p className="mt-4 text-xs text-gray-500 text-center font-medium">
                    {walletStatus.isDeploying ? 'Deploying account...'
                      : walletStatus.isRegistering ? 'Registering session...'
                      : walletStatus.isDeployed ? 'Session expired — please re-login.'
                      : 'Deployment required.'}
                  </p>
                )}
              </div>

              {/* Non-gasless tx */}
              <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-black transition-colors relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-sm">USER PAYS</div>
                <h2 className="text-xl font-bold mb-2">Approve STRK</h2>
                <p className="text-sm text-gray-500 mb-2">
                  Same call, <span className="font-semibold text-black">no paymaster</span>. Wallet pays its own gas.
                </p>
                <p className="text-xs text-gray-400 mb-6 font-mono break-all">Token: {TOKEN_ADDRESS.slice(0, 10)}...</p>
                <button
                  onClick={handleExecuteNonGasless}
                  disabled={isExecuting || !walletStatus.isReady}
                  className="w-full bg-amber-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-600 disabled:bg-gray-300 transition-colors"
                >
                  {isExecuting ? 'Executing...' : 'Send (gasless: false)'}
                </button>
                <p className="mt-4 text-xs text-gray-400 text-center">Requires STRK in wallet for fees</p>
              </div>

              {/* Blocked tx demo */}
              <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-black transition-colors relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-sm">BLOCKED</div>
                <h2 className="text-xl font-bold mb-2">Approve ETH</h2>
                <p className="text-sm text-gray-500 mb-2">
                  This contract is <span className="font-semibold text-black">NOT</span> in the session policy.
                </p>
                <p className="text-xs text-gray-400 mb-6 font-mono break-all">Token: {ETH_ADDRESS.slice(0, 10)}...</p>
                <button
                  onClick={handleBlockedExecute}
                  disabled={isExecuting || !walletStatus.isReady}
                  className="w-full bg-gray-800 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 disabled:bg-gray-300 transition-colors"
                >
                  {isExecuting ? 'Executing...' : 'Try Unauthorized Tx'}
                </button>
                <p className="mt-4 text-xs text-gray-500 text-center">Should fail: contract not allowed</p>
              </div>

              {/* Sign Message */}
              <div className="bg-white border border-gray-200 rounded-2xl p-8 relative shadow-sm">
                <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-sm">SIGNATURE</div>
                <h2 className="text-xl font-bold mb-2">Sign Message</h2>
                <p className="text-sm text-gray-500 mb-6">TypedData signing with session key</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleSignMessage}
                    disabled={isSigning || isVerifying || !address}
                    className="w-full bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
                  >
                    {isSigning ? 'Signing...' : 'Sign Message'}
                  </button>
                  <button
                    onClick={handleVerifyOnChain}
                    disabled={isSigning || isVerifying || !address}
                    className="w-full bg-white border-2 border-black text-black px-6 py-3 rounded-xl font-medium hover:bg-gray-50 disabled:border-gray-300 disabled:text-gray-400 transition-colors"
                  >
                    {isVerifying ? 'Verifying...' : 'Sign & Verify On-Chain'}
                  </button>
                </div>
                {signatureResult && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Signature</p>
                    <p className="text-xs text-gray-700 font-mono break-all">{signatureResult}</p>
                  </div>
                )}
                {verifyResult && (
                  <div className={`mt-4 p-3 rounded-lg border ${verifyResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-xs font-mono break-all ${verifyResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                      {verifyResult.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Session Management */}
              <div className="bg-white border border-gray-200 rounded-2xl p-8 relative shadow-sm md:col-span-2">
                <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-sm">SESSION KEYS</div>
                <h2 className="text-xl font-bold mb-2">Session Management</h2>
                <p className="text-sm text-gray-500 mb-4">Renew, revoke, or emergency-revoke all session keys.</p>

                {sessionPublicKey && (
                  <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Session Key</p>
                    <p className="text-xs font-mono text-gray-700 break-all">{sessionPublicKey}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <button
                    onClick={handleRegisterSession}
                    disabled={isRegisteringSession || !walletStatus.isDeployed}
                    className="bg-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors text-sm"
                  >
                    {isRegisteringSession ? 'Registering...' : 'Register Session'}
                  </button>
                  <button
                    onClick={handleRenewSession}
                    disabled={isRenewing || !walletStatus.isReady}
                    className="bg-black text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-800 disabled:bg-gray-300 transition-colors text-sm"
                  >
                    {isRenewing ? 'Renewing...' : 'Renew Session'}
                  </button>
                  <button
                    onClick={handleRevokeSession}
                    disabled={isRevoking || !sessionPublicKey || !walletStatus.isReady}
                    className="bg-gray-700 text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-600 disabled:bg-gray-300 transition-colors text-sm"
                  >
                    {isRevoking ? 'Revoking...' : 'Revoke Session'}
                  </button>
                  <button
                    onClick={handleEmergencyRevoke}
                    disabled={isEmergencyRevoking || !walletStatus.isReady}
                    className="bg-gray-900 text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-800 disabled:bg-gray-300 transition-colors text-sm"
                  >
                    {isEmergencyRevoking ? 'Revoking All...' : 'Emergency Revoke'}
                  </button>
                </div>
              </div>

              {/* Deploy (only if not yet deployed) */}
              {!walletStatus.isDeployed && (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                  <h2 className="text-lg font-bold mb-2">Account Deployment</h2>
                  <p className="text-sm text-gray-500 mb-6">One-time gasless on-chain initialization.</p>
                  <button
                    onClick={handleDeploy}
                    disabled={walletStatus.isDeploying}
                    className="bg-black text-white px-8 py-2 rounded-full text-sm font-bold hover:bg-gray-800 disabled:opacity-50 transition-all font-mono"
                  >
                    {walletStatus.isDeploying ? 'Deploying...' : 'deploy_account()'}
                  </button>
                </div>
              )}

              {/* How it works */}
              <div className="bg-gray-50 border text-black border-gray-200 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-sm">INFO</div>
                <h2 className="text-xl font-bold mb-4">How it works</h2>
                <ul className="text-sm text-gray-600 space-y-3">
                  <li className="flex gap-2"><span>&bull;</span><span>OAuth JWT proves your identity</span></li>
                  <li className="flex gap-2"><span>&bull;</span><span>RSA-256 signature verified on-chain in Cairo</span></li>
                  <li className="flex gap-2"><span>&bull;</span><span>Session keys manage transactions in your browser</span></li>
                  <li className="flex gap-2"><span>&bull;</span><span>Completely non-custodial and secure</span></li>
                </ul>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-6 p-4 bg-gray-100 border border-gray-300 rounded-xl flex justify-between items-start gap-4">
                <p className="text-sm text-black">{error}</p>
                <button onClick={() => setError(null)} className="text-gray-400 hover:text-black shrink-0 text-xs">✕</button>
              </div>
            )}

            {/* Terminal log */}
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-6 font-mono text-sm overflow-hidden min-h-[160px]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 uppercase tracking-widest text-xs font-bold">Terminal</span>
                {lastTxHash && (
                  <a
                    href={`https://voyager.online/tx/${lastTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-black border-b border-black hover:opacity-70"
                  >
                    View Transaction &nearr;
                  </a>
                )}
              </div>
              <div className="space-y-2 h-40 overflow-y-auto text-gray-600">
                {logs.length === 0
                  ? <span className="text-gray-300">Wait for activity...</span>
                  : logs.map((log, i) => (
                    <div key={i} className="border-l-2 border-gray-200 pl-3 py-1 break-all">{log}</div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
