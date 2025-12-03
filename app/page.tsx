'use client';

import { useCavos } from '@cavos/react';
import { useState } from 'react';
import Image from 'next/image';

const TOKEN_ADDRESS = '0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D';

export default function Home() {
  const { isAuthenticated, user, address, login, execute, isLoading, cavos, logout } = useCavos();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleApprove = async () => {
    if (!address) return;

    setIsExecuting(true);
    setError(null);
    setTxHash(null);

    try {
      const approveCall = {
        contractAddress: TOKEN_ADDRESS,
        entrypoint: 'approve',
        calldata: [
          cavos.getAddress() || "",
          '1000000000000000000',
          '0',
        ],
      };

      console.log('[App] Executing approve transaction...');
      const hash = await execute(approveCall, { gasless: true });

      setTxHash(hash);
      console.log('[App] Transaction submitted:', hash);
    } catch (err: any) {
      console.error('[App] Transaction failed:', err);
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
        {/* Header */}
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

        {/* Hero Section */}
        <div className="flex min-h-screen items-center justify-center pt-20 px-4">
          <div className="w-full max-w-2xl text-center">
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-black mb-6">
              Example Application
            </h1>
            <p className="text-xl md:text-2xl text-black/70 mb-12 max-w-xl mx-auto">
              Demonstrating Cavos SDK integration for non-custodial wallets
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

            <p className="mt-12 text-sm text-black/40">
              Powered by Cavos SDK
            </p>
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
            <span className="text-sm text-black/40">Example App</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity"
              aria-label="Toggle menu"
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

      {/* Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Slide-in Menu */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex justify-end p-6">
            <button
              onClick={() => setIsMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center hover:opacity-70 transition-opacity"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 px-8 space-y-6">
            <button
              onClick={() => {
                window.location.href = '/test';
                setIsMenuOpen(false);
              }}
              className="block text-2xl font-medium text-black hover:opacity-70 transition-opacity text-left w-full"
            >
              Test Page
            </button>
            <button
              onClick={() => {
                logout();
                setIsMenuOpen(false);
              }}
              className="block text-2xl font-medium text-red-600 hover:opacity-70 transition-opacity text-left w-full"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 pt-32 pb-16">
        {/* Welcome */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black mb-3">
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-lg text-black/60">{user?.email}</p>
        </div>

        {/* Wallet Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-sm font-medium text-black/60 mb-2">
                Wallet Address
              </h2>
              <p className="font-mono text-sm text-black break-all">
                {address}
              </p>
            </div>
            <span className="ml-4 inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 border border-green-200">
              Deployed
            </span>
          </div>
        </div>

        {/* Transaction Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-black mb-6">
            Token Approval Demo
          </h2>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-medium text-black/60 mb-1">
                Token Address
              </p>
              <p className="font-mono text-xs text-black break-all">
                {TOKEN_ADDRESS}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-medium text-black/60 mb-1">
                Amount
              </p>
              <p className="text-sm font-medium text-black">
                1.0 tokens
              </p>
            </div>
          </div>

          <button
            onClick={handleApprove}
            disabled={isExecuting}
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
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {txHash && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm font-medium text-green-800 mb-2">
                Transaction Submitted
              </p>
              <p className="text-xs text-green-700 font-mono break-all mb-2">
                {txHash}
              </p>
              <a
                href={`https://sepolia.starkscan.co/tx/${txHash}`}
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
        </div>

        {/* Info */}
        <div className="mt-8 p-6 bg-gray-50 border border-gray-100 rounded-2xl">
          <h3 className="text-sm font-semibold text-black mb-2">
            About This Example
          </h3>
          <p className="text-sm text-black/70">
            This application demonstrates the Cavos SDK integration. All transactions are gasless on Sepolia testnet.
            Check out the <a href="/test" className="underline font-medium">Test Page</a> for more examples.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-8 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <Image
              src="/cavos-black.png"
              alt="Cavos"
              width={100}
              height={40}
              className="h-8 w-auto"
            />
          </div>

          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Cavos Labs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
