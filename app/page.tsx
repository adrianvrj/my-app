'use client';

import { useCavos, EmailVerificationRequiredError, EmailNotVerifiedError } from '@cavos/react';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

// Example contract - STRK token on Sepolia
const TOKEN_ADDRESS = '0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D';

// Force dynamic rendering to prevent SSR from trying to parse auth_data
export const dynamic = 'force-dynamic';

export default function Home() {
  const {
    isAuthenticated,
    user,
    address,
    login,
    register,
    logout,
    isLoading: sdkLoading,
    execute,
    deployAccount,
    getBalance,
    walletStatus,
    resendVerificationEmail,
    signMessage
  } = useCavos();

  const [txCount, setTxCount] = useState(0);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [balance, setBalance] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureResult, setSignatureResult] = useState<string | null>(null);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-9), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Log wallet status changes
  useEffect(() => {
    if (walletStatus.isDeploying) {
      addLog('Deploying account...');
    }
    if (walletStatus.isRegistering) {
      addLog('Registering session...');
    }
    if (walletStatus.isReady && !walletStatus.isDeploying && !walletStatus.isRegistering) {
      addLog('Wallet ready!');
    }
  }, [walletStatus.isDeploying, walletStatus.isRegistering, walletStatus.isReady, addLog]);

  // Sync balance periodically
  useEffect(() => {
    if (!isAuthenticated || !address) return;

    let cancelled = false;

    const syncBalance = async () => {
      if (cancelled) return;
      try {
        const bal = await getBalance();
        if (cancelled) return;
        setBalance((Number(bal) / 1e18).toFixed(4));
      } catch (e) {
        console.error('[App] Balance sync error:', e);
      }
    };

    syncBalance();
    const interval = setInterval(syncBalance, 30000); // Sync every 30s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, address]);

  // Handle login
  const handleLogin = async (provider: 'google' | 'apple') => {
    setError(null);
    setVerificationRequired(false);
    addLog(`Logging in with ${provider}...`);
    try {
      await login(provider);
    } catch (err) {
      const error = err as Error;
      console.error('[App] Login error:', error);
      setError(error.message || 'Failed to login');
      addLog(`Error: ${error.message}`);
    }
  };

  // Handle Firebase login
  const handleFirebaseLogin = async () => {
    setError(null);
    setVerificationRequired(false);
    addLog('Logging in with Firebase...');
    try {
      await login('firebase', { email, password });
    } catch (err) {
      console.error('[App] Login error:', err);

      if (err instanceof EmailNotVerifiedError) {
        setError('Please verify your email before logging in. Check your inbox for the verification link.');
        setPendingEmail(err.email);
        setVerificationRequired(true);
        addLog(`Error: Email not verified`);
      } else {
        const error = err as Error;
        setError(error.message || 'Failed to login');
        addLog(`Error: ${error.message}`);
      }
    }
  };

  // Handle Firebase registration
  const handleFirebaseRegister = async () => {
    setError(null);
    setVerificationRequired(false);
    addLog('Registering with Firebase...');
    try {
      await register('firebase', { email, password });
    } catch (err) {
      console.error('[App] Register error:', err);

      if (err instanceof EmailVerificationRequiredError) {
        setError(null);
        setVerificationRequired(true);
        setPendingEmail(err.email);
        addLog(`✓ Registration successful! Check ${err.email} for verification link.`);
      } else {
        const error = err as Error;
        setError(error.message || 'Failed to register');
        addLog(`Error: ${error.message}`);
      }
    }
  };

  // Handle resend verification email
  const handleResendVerification = async () => {
    if (!pendingEmail) return;

    setError(null);
    addLog('Resending verification email...');
    try {
      await resendVerificationEmail(pendingEmail);
      addLog(`✓ Verification email sent to ${pendingEmail}`);
    } catch (err) {
      const error = err as Error;
      console.error('[App] Resend error:', error);
      setError(error.message || 'Failed to resend verification email');
      addLog(`Error: ${error.message}`);
    }
  };

  // Handle execute transaction
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
      addLog(`✓ Tx #${txNum} success: ${hash.slice(0, 20)}...`);
    } catch (err) {
      const error = err as Error;
      console.error('[App] Execute error:', error);
      setError(error.message || 'Transaction failed');
      addLog(`✗ Error: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle manual deployment
  const handleDeploy = async () => {
    addLog('Deploying account...');
    try {
      const hash = await deployAccount();
      addLog(`✓ Deployment submitted: ${hash}`);
    } catch (err) {
      const error = err as Error;
      console.error('[App] Deploy error:', error);
      addLog(`✗ Deployment failed: ${error.message}`);
    }
  };

  // Handle sign message
  const handleSignMessage = async () => {
    setIsSigning(true);
    setError(null);
    setSignatureResult(null);
    addLog('Signing message...');

    try {
      const typedData = {
        types: {
          StarkNetDomain: [
            { name: 'name', type: 'shortstring' },
            { name: 'version', type: 'shortstring' },
          ],
          Message: [
            { name: 'content', type: 'felt' },
          ],
        },
        primaryType: 'Message',
        domain: {
          name: 'CavosApp',
          version: '1',
        },
        message: {
          content: '0x48656c6c6f20576f726c64', // "Hello World" in hex
        },
      };

      const signature = await signMessage(typedData);
      const sigStr = `r: ${signature.r.slice(0, 20)}..., s: ${signature.s.slice(0, 20)}...`;
      setSignatureResult(sigStr);
      addLog(`✓ Message signed: ${sigStr}`);
    } catch (err) {
      const error = err as Error;
      console.error('[App] Sign error:', error);
      setError(error.message || 'Signing failed');
      addLog(`✗ Error: ${error.message}`);
    } finally {
      setIsSigning(false);
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    logout();
    setTxCount(0);
    setLastTxHash(null);
    setLogs([]);
    setIsMobileMenuOpen(false);
    addLog('Signed out');
  };

  if (sdkLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
          <p className="mt-4 text-black/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row text-black">

      {/* Mobile Menu Button - Only visible when authenticated on mobile */}
      {isAuthenticated && (
        <div className="md:hidden fixed top-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md z-40 border-b border-gray-100 flex justify-between items-center">
          <Image src="/cavos-black.png" alt="Cavos" width={80} height={32} className="h-6 w-auto" />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-black"
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>
        </div>
      )}

      {/* Sidebar - Responsive */}
      {isAuthenticated && (
        <>
          {/* Overlay for mobile */}
          {isMobileMenuOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          <aside className={`
            bg-black text-white p-6 flex flex-col h-screen overflow-y-auto
            fixed md:sticky top-0 left-0 z-50 transition-transform duration-300 ease-in-out w-80
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <div className="mb-8 hidden md:block">
              <Image src="/cavos-black.png" alt="Cavos" width={100} height={40} className="h-8 w-auto filter invert" />
            </div>

            {/* Mobile Header in Sidebar */}
            <div className="md:hidden mb-8 flex justify-between items-center">
              <Image src="/cavos-black.png" alt="Cavos" width={100} height={40} className="h-8 w-auto filter invert" />
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-white">✕</button>
            </div>

            <div className="flex-1 space-y-8">
              {/* Account Info */}
              <div>
                <p className="text-xs text-white/50 uppercase tracking-widest mb-2 font-medium">Account</p>
                <div className="bg-white/10 rounded-lg p-3 border border-white/10">
                  <p className="text-xs font-mono text-white/90 break-all mb-1">{address}</p>
                  {user?.email && (
                    <p className="text-xs text-white/50">{user.email}</p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs text-white/50 uppercase tracking-widest mb-2 font-medium">Status</p>
                <div className="flex items-center justify-between bg-white/10 rounded-lg p-3 border border-white/10">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      walletStatus.isReady ? 'bg-green-400' :
                      (walletStatus.isDeploying || walletStatus.isRegistering) ? 'bg-blue-400 animate-pulse' :
                      'bg-yellow-400'
                    }`}></span>
                    <span className="text-sm font-medium">
                      {walletStatus.isDeploying ? 'Deploying...' :
                       walletStatus.isRegistering ? 'Registering...' :
                       walletStatus.isReady ? 'Ready' :
                       'Pending'}
                    </span>
                  </div>
                  <span className="text-xs text-white/50">{balance} ETH</span>
                </div>
              </div>

              {/* Transaction Stats */}
              <div>
                <p className="text-xs text-white/50 uppercase tracking-widest mb-2 font-medium">Transactions</p>
                <p className="text-4xl font-light text-white">{txCount}</p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
            >
              ← Sign Out
            </button>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-8 pt-24 md:pt-8 w-full">
        {!isAuthenticated ? (
          // Login View
          <div className="text-center max-w-md w-full">
            <h1 className="text-4xl font-bold text-black mb-4">OAuth Wallet</h1>
            <p className="text-black/60 mb-8 text-lg">
              Self-custodial Starknet wallet powered by your Google account.
              <br /><span className="text-sm">No passkeys, no seed phrases, pure OAuth.</span>
            </p>

            {/* Login Options */}
            <div className="space-y-4">
              <button
                onClick={() => handleLogin('google')}
                className="w-full flex items-center justify-center gap-3 bg-white text-black border border-gray-200 px-6 py-4 rounded-full font-medium hover:border-black transition-all shadow-sm"
              >
                Continue with Google
              </button>

              <button
                onClick={() => handleLogin('apple')}
                className="w-full flex items-center justify-center gap-3 bg-black text-white px-6 py-4 rounded-full font-medium hover:bg-black/80 transition-all border border-black shadow-sm"
              >
                Continue with Apple
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or with email</span>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-black focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-black focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleFirebaseLogin}
                    disabled={sdkLoading || !email || !password}
                    className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                  >
                    {sdkLoading ? 'Loading...' : 'Login'}
                  </button>
                  <button
                    onClick={handleFirebaseRegister}
                    disabled={sdkLoading || !email || !password}
                    className="flex-1 px-6 py-3 bg-white text-black border border-gray-300 rounded-full font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                  >
                    {sdkLoading ? 'Loading...' : 'Register'}
                  </button>
                </div>
              </div>
            </div>

            {verificationRequired && pendingEmail && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  📧 Verification email sent!
                </p>
                <p className="text-sm text-blue-700 mb-3">
                  We sent a verification link to <span className="font-medium">{pendingEmail}</span>.
                  Please check your inbox and click the link to verify your email.
                </p>
                <button
                  onClick={handleResendVerification}
                  className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Resend verification email
                </button>
              </div>
            )}

            {error && !verificationRequired && (
              <p className="mt-6 text-sm text-red-600 bg-red-50 py-2 px-4 rounded">{error}</p>
            )}
          </div>
        ) : (
          // Authenticated View
          <div className="w-full max-w-3xl">
            <h1 className="text-4xl font-bold text-black mb-2">Ready to Transact</h1>
            <p className="text-black/60 mb-12 text-lg">
              Your OAuth session is active. All transactions are gasless and verified on-chain.
            </p>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">

              {/* Transaction Action */}
              <div className="bg-white border text-black border-gray-200 rounded-2xl p-8 hover:border-black transition-colors relative overflow-hidden group">
                <div className="absolute top-4 right-4 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-sm">
                  GASLESS
                </div>
                <h2 className="text-xl font-bold mb-2">Approve STRK</h2>
                <p className="text-sm text-gray-500 mb-6 font-mono break-all">
                  Token: {TOKEN_ADDRESS.slice(0, 10)}...
                </p>
                <button
                  onClick={handleExecute}
                  disabled={isExecuting || !walletStatus.isReady}
                  className="w-full bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
                >
                  {isExecuting ? 'Executing...' :
                   walletStatus.isDeploying ? 'Deploying...' :
                   walletStatus.isRegistering ? 'Registering session...' :
                   'Send Transaction'}
                </button>
                {!walletStatus.isReady && (
                  <p className="mt-4 text-xs text-orange-600 text-center font-medium">
                    {walletStatus.isDeploying ? 'Deploying account...' :
                     walletStatus.isRegistering ? 'Registering session...' :
                     'Deployment required to send transactions.'}
                  </p>
                )}
              </div>

              {/* Sign Message Action */}
              <div className="bg-white border border-gray-200 rounded-2xl p-8 relative shadow-sm">
                <div className="absolute top-4 right-4 bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded-sm">
                  SIGNATURE
                </div>
                <h2 className="text-xl font-bold mb-2">Sign Message</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Test TypedData signing with ephemeral key
                </p>
                <button
                  onClick={handleSignMessage}
                  disabled={isSigning || !address}
                  className="w-full bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
                >
                  {isSigning ? 'Signing...' : 'Sign Message'}
                </button>
                {signatureResult && (
                  <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-xs text-purple-800 font-mono break-all">
                      {signatureResult}
                    </p>
                  </div>
                )}
              </div>

              {/* Deployment Action - Only if not deployed */}
              {!walletStatus.isDeployed && (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                  <h2 className="text-lg font-bold mb-2">Account Deployment</h2>
                  <p className="text-sm text-gray-500 mb-6">Initialize your account on-chain. This is a one-time gasless action.</p>
                  <button
                    onClick={handleDeploy}
                    disabled={walletStatus.isDeploying}
                    className="bg-black text-white px-8 py-2 rounded-full text-sm font-bold hover:bg-gray-800 disabled:opacity-50 transition-all font-mono"
                  >
                    {walletStatus.isDeploying ? 'Deploying...' : 'deploy_account()'}
                  </button>
                </div>
              )}

              {/* Info Card */}
              <div className="bg-linear-to-br from-green-50 to-emerald-50 border text-black border-green-200 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-sm">
                  OAUTH INFO
                </div>
                <h2 className="text-xl font-bold mb-4">How it works</h2>
                <ul className="text-sm text-gray-600 space-y-3">
                  <li className="flex gap-2"><span>•</span> <span>OAuth JWT proves your identity</span></li>
                  <li className="flex gap-2"><span>•</span> <span>RSA-256 signature verified on-chain in Cairo</span></li>
                  <li className="flex gap-2"><span>•</span> <span>Ephemeral keys manage sessions in your browser</span></li>
                  <li className="flex gap-2"><span>•</span> <span>Completely non-custodial and secure</span></li>
                </ul>
              </div>
            </div>

            {/* Logs Console */}
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-6 font-mono text-sm overflow-hidden min-h-[160px]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 uppercase tracking-widest text-xs font-bold">Terminal</span>
                {lastTxHash && (
                  <a href={`https://sepolia.voyager.online/tx/${lastTxHash}`} target="_blank" rel="noreferrer" className="text-xs text-black border-b border-black hover:opacity-70">
                    View Transaction ↗
                  </a>
                )}
              </div>
              <div className="space-y-2 h-40 overflow-y-auto text-gray-600">
                {logs.length === 0 ? (
                  <span className="text-gray-300">Wait for activity...</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="border-l-2 border-gray-200 pl-3 py-1 break-all">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
