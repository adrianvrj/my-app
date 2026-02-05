'use client';

import { useCavos, useSession } from '@cavos/react';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Example contract - STRK token on Sepolia (ALLOWED in policy)
const TOKEN_ADDRESS = '0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D';
// ETH token on Sepolia (NOT in policy - should fail)
const ETH_ADDRESS = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';

export default function SessionsPage() {
    const { isAuthenticated, address, isLoading } = useCavos();
    const { hasActiveSession, createSession, executeWithSession, clearSession } = useSession();

    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [isExecutingUnauthorized, setIsExecutingUnauthorized] = useState(false);
    const [txCount, setTxCount] = useState(0);
    const [lastTxHash, setLastTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sessionLog, setSessionLog] = useState<string[]>([]);

    const addLog = (message: string) => {
        setSessionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    const handleCreateSession = async () => {
        setIsCreatingSession(true);
        setError(null);
        addLog('Creating session...');

        try {
            await createSession({
                allowedMethods: [
                    {
                        contractAddress: TOKEN_ADDRESS,
                        selector: 'approve',
                    },
                    {
                        contractAddress: TOKEN_ADDRESS,
                        selector: 'transfer',
                    },
                ],
                expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
            });
            addLog('Session created successfully!');
            addLog('You can now execute transactions without signing each one.');
        } catch (err) {
            const error = err as Error;
            console.error('[Sessions] Create session error:', error);
            setError(error.message || 'Failed to create session');
            addLog(`Error: ${error.message}`);
        } finally {
            setIsCreatingSession(false);
            console.log(hasActiveSession);
        }
    };

    const handleExecuteWithSession = async () => {
        setIsExecuting(true);
        setError(null);

        const txNumber = txCount + 1;
        addLog(`Executing transaction #${txNumber} (no signature required)...`);

        try {
            const hash = await executeWithSession({
                contractAddress: TOKEN_ADDRESS,
                entrypoint: 'approve',
                calldata: [
                    address || '',
                    '1000000000000000000',
                    '0',
                ],
            });

            setTxCount(txNumber);
            setLastTxHash(hash);
            addLog(`Transaction #${txNumber} successful: ${hash.slice(0, 20)}...`);
        } catch (err) {
            const error = err as Error;
            console.error('[Sessions] Execute error:', error);
            setError(error.message || 'Transaction failed');
            addLog(`Error: ${error.message}`);
        } finally {
            setIsExecuting(false);
        }
    };

    // Test unauthorized call - should fail because ETH is NOT in the policy
    const handleExecuteUnauthorized = async () => {
        setIsExecutingUnauthorized(true);
        setError(null);

        addLog('Testing unauthorized call (ETH contract - NOT in policy)...');

        try {
            const hash = await executeWithSession({
                contractAddress: ETH_ADDRESS,  // ETH contract, NOT in policy
                entrypoint: 'approve',
                calldata: [
                    address || '',
                    '1000000000000000000',
                    '0',
                ],
            });

            // If we get here, something is wrong - this should have failed!
            setLastTxHash(hash);
            addLog(`⚠️ UNEXPECTED: Unauthorized call succeeded: ${hash.slice(0, 20)}...`);
        } catch (err) {
            const error = err as Error;
            console.error('[Sessions] Unauthorized execute error (expected):', error);
            // This is the expected behavior!
            addLog(`✅ EXPECTED: Unauthorized call rejected: ${error.message?.slice(0, 100) || 'Policy violation'}`);
            setError(`Policy enforcement working! Call rejected: ${error.message?.slice(0, 100) || 'Policy violation'}`);
        } finally {
            setIsExecutingUnauthorized(false);
        }
    };

    const handleClearSession = () => {
        clearSession();
        setTxCount(0);
        setLastTxHash(null);
        setSessionLog([]);
        addLog('Session cleared.');
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
                    <p className="mt-4 text-black/60">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !address) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-black mb-4">Not Authenticated</h1>
                    <p className="text-black/60 mb-6">Please login from the home page first.</p>
                    <Link href="/" className="text-black underline">Go to Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
                <div className="max-w-[1400px] mx-auto px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/">
                            <Image
                                src="/cavos-black.png"
                                alt="Cavos"
                                width={120}
                                height={48}
                                className="h-10 w-auto"
                            />
                        </Link>
                        <span className="text-sm text-black/40">Session Keys Demo</span>
                    </div>
                    <Link href="/" className="text-sm text-black/60 hover:text-black">
                        ← Back to Home
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-8 pt-32 pb-16">
                <h1 className="text-4xl font-semibold tracking-tight text-black mb-3">
                    Session Keys Demo
                </h1>
                <p className="text-lg text-black/60 mb-8">
                    Sign once, execute many transactions without additional prompts.
                </p>

                {/* Session Status */}
                <div className={`rounded-2xl p-6 mb-6 border ${hasActiveSession ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-black mb-1">
                                Session Status
                            </h2>
                            <p className={`text-sm ${hasActiveSession ? 'text-green-700' : 'text-black/60'}`}>
                                {hasActiveSession ? 'Session Active - Ready to execute transactions' : 'No active session'}
                            </p>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-sm font-medium ${hasActiveSession ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {hasActiveSession ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Create Session */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-black mb-2">1. Create Session</h3>
                        <p className="text-sm text-black/60 mb-4">
                            Sign once to authorize future transactions. This creates a session key that can execute specific actions.
                        </p>
                        <button
                            onClick={handleCreateSession}
                            disabled={isCreatingSession || hasActiveSession}
                            className="w-full bg-black text-white px-6 py-3 rounded-full hover:bg-black/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-medium"
                        >
                            {isCreatingSession ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                                    Creating Session...
                                </span>
                            ) : hasActiveSession ? (
                                'Session Already Active'
                            ) : (
                                'Create Session (Sign Once)'
                            )}
                        </button>
                    </div>

                    {/* Execute with Session */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-black mb-2">2. Execute Transactions</h3>
                        <p className="text-sm text-black/60 mb-4">
                            Execute transactions using the session key. No signature required!
                        </p>
                        <button
                            onClick={handleExecuteWithSession}
                            disabled={isExecuting || !hasActiveSession}
                            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-full hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-medium"
                        >
                            {isExecuting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                                    Executing...
                                </span>
                            ) : !hasActiveSession ? (
                                'Create Session First'
                            ) : (
                                'Execute (No Signature)'
                            )}
                        </button>
                        {hasActiveSession && (
                            <p className="text-center text-sm text-black/40 mt-2">
                                Transactions executed: {txCount}
                            </p>
                        )}
                    </div>

                    {/* Test Unauthorized Call */}
                    <div className="bg-white border border-orange-200 rounded-2xl p-6 md:col-span-2">
                        <h3 className="text-lg font-semibold text-orange-700 mb-2">3. Test Policy Enforcement</h3>
                        <p className="text-sm text-black/60 mb-4">
                            Try to execute on ETH contract (NOT in policy). This should <strong>fail</strong> with a policy violation.
                        </p>
                        <button
                            onClick={handleExecuteUnauthorized}
                            disabled={isExecutingUnauthorized || !hasActiveSession}
                            className="w-full bg-orange-600 text-white px-6 py-3 rounded-full hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-medium"
                        >
                            {isExecutingUnauthorized ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                                    Testing...
                                </span>
                            ) : !hasActiveSession ? (
                                'Create Session First'
                            ) : (
                                '🔒 Test Unauthorized Call (ETH)'
                            )}
                        </button>
                    </div>
                </div>

                {/* Clear Session */}
                {hasActiveSession && (
                    <div className="mb-8">
                        <button
                            onClick={handleClearSession}
                            className="text-red-600 hover:text-red-700 text-sm font-medium underline"
                        >
                            Clear Session
                        </button>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Last Transaction */}
                {lastTxHash && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-sm font-medium text-green-800 mb-2">
                            Last Transaction
                        </p>
                        <p className="text-xs text-green-700 font-mono break-all mb-2">
                            {lastTxHash}
                        </p>
                        <a
                            href={`https://sepolia.starkscan.co/tx/${lastTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline"
                        >
                            View on Starkscan
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                )}

                {/* Session Log */}
                <div className="bg-gray-900 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-white mb-4">Session Log</h3>
                    <div className="font-mono text-xs text-gray-400 space-y-1 max-h-48 overflow-y-auto">
                        {sessionLog.length === 0 ? (
                            <p className="text-gray-500">No activity yet. Create a session to get started.</p>
                        ) : (
                            sessionLog.map((log, i) => (
                                <p key={i}>{log}</p>
                            ))
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="mt-8 p-6 bg-gray-50 border border-gray-100 rounded-2xl">
                    <h3 className="text-sm font-semibold text-black mb-2">
                        How Session Keys Work
                    </h3>
                    <ul className="text-sm text-black/70 space-y-2">
                        <li>• <strong>Step 1:</strong> Create a session by signing once. This authorizes specific contract calls.</li>
                        <li>• <strong>Step 2:</strong> Execute transactions using the session key - no additional signatures needed.</li>
                        <li>• <strong>Security:</strong> Sessions are time-limited and scoped to specific contracts/methods.</li>
                        <li>• <strong>Gasless:</strong> All transactions are still gasless via AVNU Paymaster.</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
