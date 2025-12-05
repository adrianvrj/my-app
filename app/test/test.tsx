'use client';

import { useCavos } from '@cavos/react';
import { useState } from 'react';
import Image from 'next/image';

const TOKEN_ADDRESS = '0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D';

export default function TestPage() {
    const { isAuthenticated, user, address, login, execute, signMessage, deleteAccount, isLoading, logout } = useCavos();
    const [spenderAddress, setSpenderAddress] = useState('');
    const [amount, setAmount] = useState('1');
    const [txHash, setTxHash] = useState<string | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [signature, setSignature] = useState<{ r: string; s: string } | null>(null);
    const [isSigning, setIsSigning] = useState(false);

    const handleSignMessage = async () => {
        setIsSigning(true);
        setError(null);
        setSignature(null);

        try {
            const sig = await signMessage('Hello world!');
            setSignature(sig);
            console.log('[Test] Message signed:', sig);
        } catch (err: any) {
            console.error('[Test] Signing failed:', err);
            setError(err.message || 'Signing failed');
        } finally {
            setIsSigning(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmed = window.confirm(
            '⚠️ WARNING: This will permanently delete your account from Auth0 and remove your wallet from the database.\n\nThis action CANNOT be undone.\n\nAre you absolutely sure you want to continue?'
        );

        if (!confirmed) return;

        // Double confirmation
        const doubleConfirmed = window.confirm(
            'This is your last chance to cancel.\n\nClick OK to permanently delete your account.'
        );

        if (!doubleConfirmed) return;

        setIsExecuting(true);
        setError(null);

        try {
            await deleteAccount();
            console.log('[Test] Account deleted successfully');
            // User will be logged out automatically by the SDK
        } catch (err: any) {
            console.error('[Test] Account deletion failed:', err);
            setError(err.message || 'Account deletion failed');
            setIsExecuting(false);
        }
    };

    const handleApprove = async () => {
        if (!address || !spenderAddress) {
            setError('Please enter a spender address');
            return;
        }

        setIsExecuting(true);
        setError(null);
        setTxHash(null);

        try {
            const amountInWei = BigInt(parseFloat(amount) * 10 ** 18);
            const lowPart = (amountInWei & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).toString();
            const highPart = (amountInWei >> BigInt(128)).toString();

            const approveCall = {
                contractAddress: TOKEN_ADDRESS,
                entrypoint: 'approve',
                calldata: [spenderAddress, lowPart, highPart],
            };

            console.log('[Test] Executing approve transaction...', approveCall);
            const hash = await execute(approveCall, { gasless: true });

            setTxHash(hash);
            console.log('[Test] Transaction submitted:', hash);
        } catch (err: any) {
            console.error('[Test] Transaction failed:', err);
            setError(err.message || 'Transaction failed');
        } finally {
            setIsExecuting(false);
        }
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

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-white">
                <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm">
                    <div className="max-w-[1400px] mx-auto px-8 h-20 flex items-center justify-between">
                        <Image
                            src="/cavos-black.png"
                            alt="Cavos"
                            width={120}
                            height={48}
                            className="h-10 w-auto"
                        />
                    </div>
                </header>

                <div className="flex min-h-screen items-center justify-center pt-20 px-4">
                    <div className="w-full max-w-2xl text-center">
                        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-black mb-6">
                            Test Page
                        </h1>
                        <p className="text-xl md:text-2xl text-black/70 mb-12">
                            Login to test token approval
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => login('google')}
                                className="px-8 py-4 bg-black text-white rounded-full font-medium hover:bg-black/90 transition-all text-lg"
                            >
                                Continue with Google
                            </button>
                            <button
                                onClick={() => login('apple')}
                                className="px-8 py-4 bg-[#f7eded] text-black rounded-full font-medium hover:bg-[#efe5e5] transition-all text-lg"
                            >
                                Continue with Apple
                            </button>
                        </div>
                    </div>
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
                        <Image
                            src="/cavos-black.png"
                            alt="Cavos"
                            width={120}
                            height={48}
                            className="h-10 w-auto"
                        />
                        <span className="text-sm text-black/40">Test Page</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Menu */}
            {isMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
            )}

            <div className={`fixed top-0 right-0 h-full w-80 bg-white z-50 shadow-2xl transform transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="flex justify-end p-6">
                        <button onClick={() => setIsMenuOpen(false)} className="w-10 h-10 flex items-center justify-center hover:opacity-70">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    <nav className="flex-1 px-8 space-y-6">
                        <button
                            onClick={() => { window.location.href = '/'; setIsMenuOpen(false); }}
                            className="block text-2xl font-medium text-black hover:opacity-70 transition-opacity text-left w-full"
                        >
                            Home
                        </button>
                        <button
                            onClick={() => { handleDeleteAccount(); setIsMenuOpen(false); }}
                            className="block text-2xl font-medium text-red-600 hover:opacity-70 transition-opacity text-left w-full"
                            disabled={isExecuting}
                        >
                            {isExecuting ? 'Deleting...' : 'Delete Account'}
                        </button>
                        <button
                            onClick={() => { logout(); setIsMenuOpen(false); }}
                            className="block text-2xl font-medium text-black/60 hover:opacity-70 transition-opacity text-left w-full"
                        >
                            Sign Out
                        </button>
                    </nav>
                </div>
            </div>

            {/* Main */}
            <main className="max-w-2xl mx-auto px-8 pt-32 pb-16">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black mb-3">
                        Token Approval Test
                    </h1>
                    <p className="text-lg text-black/60">
                        Approve a spender with custom parameters
                    </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-black/70 mb-2">
                                Your Wallet
                            </label>
                            <div className="px-4 py-3 bg-gray-50 rounded-xl text-sm text-black font-mono break-all border border-gray-100">
                                {address}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-black/70 mb-2">
                                Token Address
                            </label>
                            <div className="px-4 py-3 bg-gray-50 rounded-xl text-sm text-black font-mono break-all border border-gray-100">
                                {TOKEN_ADDRESS}
                            </div>
                            <p className="mt-1 text-xs text-black/40">STRK on Sepolia</p>
                        </div>

                        <div>
                            <label htmlFor="spender" className="block text-sm font-medium text-black/70 mb-2">
                                Spender Address *
                            </label>
                            <input
                                id="spender"
                                type="text"
                                value={spenderAddress}
                                onChange={(e) => setSpenderAddress(e.target.value)}
                                placeholder="0x..."
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-black focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                            />
                            <p className="mt-1 text-xs text-black/40">
                                Address that will be approved to spend
                            </p>
                        </div>

                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-black/70 mb-2">
                                Amount (tokens)
                            </label>
                            <input
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="1.0"
                                step="0.01"
                                min="0"
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-black focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                            />
                            <p className="mt-1 text-xs text-black/40">
                                Will be converted to wei
                            </p>
                        </div>

                        <button
                            onClick={handleSignMessage}
                            disabled={isSigning}
                            className="w-full bg-blue-600 text-white px-6 py-4 rounded-full hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-medium"
                        >
                            {isSigning ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                                    Signing...
                                </span>
                            ) : (
                                'Sign Message "Hello world!"'
                            )}
                        </button>

                        <button
                            onClick={handleApprove}
                            disabled={isExecuting || !spenderAddress}
                            className="w-full bg-black text-white px-6 py-4 rounded-full hover:bg-black/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-medium"
                        >
                            {isExecuting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                                    Approving...
                                </span>
                            ) : (
                                'Approve Token (Gasless)'
                            )}
                        </button>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-sm font-medium text-red-800">Error</p>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        )}

                        {txHash && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                <p className="text-sm font-medium text-green-800 mb-2">
                                    Transaction Submitted
                                </p>
                                <p className="text-xs text-green-700 font-mono break-all mb-3">
                                    {txHash}
                                </p>
                                <a
                                    href={`https://sepolia.starkscan.co/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline font-medium"
                                >
                                    View on Starkscan
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            </div>
                        )}

                        {signature && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                <p className="text-sm font-medium text-blue-800 mb-2">
                                    Message Signed Successfully
                                </p>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-xs font-medium text-blue-700">r:</p>
                                        <p className="text-xs text-blue-600 font-mono break-all">{signature.r}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-blue-700">s:</p>
                                        <p className="text-xs text-blue-600 font-mono break-all">{signature.s}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 p-6 bg-gray-50 border border-gray-100 rounded-2xl">
                    <h3 className="text-sm font-semibold text-black mb-2">
                        About This Test
                    </h3>
                    <p className="text-sm text-black/70">
                        Demonstrates custom transaction parameters. Amount is converted to wei and split for Starknet's uint256 format.
                    </p>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full py-8 px-8 bg-white border-t border-gray-100">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <Image
                        src="/cavos-black.png"
                        alt="Cavos"
                        width={100}
                        height={40}
                        className="h-8 w-auto"
                    />
                    <p className="text-sm text-gray-400">
                        © {new Date().getFullYear()} Cavos Labs. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
