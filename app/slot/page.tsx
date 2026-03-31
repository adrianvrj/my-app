'use client';

import { useCavos, useSlot } from '@cavos/react';
import { useState } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const SLOT_RPC = 'https://api.cartridge.gg/x/cavos/katana';

// Simple ERC-20 transfer calldata (transfer 0 tokens — safe no-op for testing)
const DUMMY_CONTRACT = '0x04718f5a0Fc34cC1AF16A1cdee98fFB20C31f5cD61D6Ab07201858f4287c938D';

export default function SlotPage() {
  const { isAuthenticated, address, isLoading: sdkLoading, openModal } = useCavos();
  const { isSlotDeployed, isSlotDeploying, executeOnSlot, slotProvider } = useSlot();

  const [txHash, setTxHash] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [isFetchingBlock, setIsFetchingBlock] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('1');

  const fetchBlockNumber = async () => {
    if (!slotProvider) return;
    setIsFetchingBlock(true);
    setError(null);
    try {
      const block = await slotProvider.getBlockNumber();
      setBlockNumber(block);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsFetchingBlock(false);
    }
  };

  const sendTransaction = async () => {
    if (!isSlotDeployed) return;
    setIsExecuting(true);
    setError(null);
    setTxHash(null);
    try {
      const spender = recipient || address || '0x0';
      // STRK approve: approve(spender, amount_low, amount_high)
      const amountWei = BigInt(parseFloat(amount) * 1e18).toString();
      const hash = await executeOnSlot([
        {
          contractAddress: DUMMY_CONTRACT,
          entrypoint: 'approve',
          calldata: [spender, amountWei, '0'],
        },
      ]);
      setTxHash(hash);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsExecuting(false);
    }
  };

  if (sdkLoading) {
    return (
      <div style={styles.page}>
        <p style={styles.muted}>Loading SDK...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>Slot</h2>
          <p style={styles.muted}>Connect your wallet to use the Slot chain.</p>
          <button style={styles.btn} onClick={openModal}>Connect</button>
          <Link href="/" style={styles.link}>← Back to main</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Slot Chain</h2>
          <Link href="/" style={styles.link}>← Back to main</Link>
        </div>

        {/* Status */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Status</h3>
          <div style={styles.row}>
            <span style={styles.label}>Wallet</span>
            <span style={styles.value}>{address ? `${address.slice(0, 8)}...${address.slice(-6)}` : '—'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Slot RPC</span>
            <span style={styles.value}>{SLOT_RPC.replace('https://', '')}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Deployed on Slot</span>
            <span style={{ ...styles.badge, background: isSlotDeployed ? '#16a34a' : isSlotDeploying ? '#d97706' : '#475569' }}>
              {isSlotDeploying ? 'Deploying...' : isSlotDeployed ? 'Yes' : 'No'}
            </span>
          </div>
        </section>

        {/* Read: block number */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Read (no signature needed)</h3>
          <div style={styles.row}>
            <span style={styles.label}>Block number</span>
            <span style={styles.value}>{blockNumber !== null ? `#${blockNumber}` : '—'}</span>
          </div>
          <button style={styles.btn} onClick={fetchBlockNumber} disabled={isFetchingBlock || !slotProvider}>
            {isFetchingBlock ? 'Fetching...' : 'Get block number'}
          </button>
        </section>

        {/* Write: approve STRK on Slot */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Approve STRK on Slot</h3>
          {!isSlotDeployed && (
            <p style={styles.warning}>
              {isSlotDeploying ? 'Wallet is being deployed to Slot — please wait...' : 'Wallet not deployed on Slot yet.'}
            </p>
          )}
          <label style={styles.label}>Spender</label>
          <input
            style={styles.input}
            placeholder="0x..."
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            disabled={!isSlotDeployed}
          />
          <label style={styles.label}>Amount (STRK)</label>
          <input
            style={styles.input}
            type="number"
            min="0"
            step="0.001"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            disabled={!isSlotDeployed}
          />
          <button
            style={{ ...styles.btn, opacity: isSlotDeployed && !isExecuting ? 1 : 0.5 }}
            onClick={sendTransaction}
            disabled={!isSlotDeployed || isExecuting}
          >
            {isExecuting ? 'Approving...' : 'Approve on Slot'}
          </button>
          {txHash && (
            <div style={styles.success}>
              <span>Tx sent!</span>
              <code style={styles.hash}>{txHash}</code>
            </div>
          )}
          {error && <p style={styles.error}>{error}</p>}
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '48px 16px',
  },
  card: {
    background: '#1e293b',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 560,
    color: '#f8fafc',
    fontFamily: 'monospace',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  section: {
    marginBottom: 28,
    borderTop: '1px solid #334155',
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 12,
    marginTop: 0,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    display: 'block',
    marginBottom: 4,
  },
  value: {
    fontSize: 13,
    color: '#f8fafc',
    wordBreak: 'break-all',
  },
  badge: {
    borderRadius: 6,
    padding: '2px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
  },
  btn: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
    width: '100%',
  },
  input: {
    width: '100%',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#f8fafc',
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 12,
    boxSizing: 'border-box',
  },
  link: {
    color: '#818cf8',
    fontSize: 13,
    textDecoration: 'none',
  },
  muted: {
    color: '#64748b',
    fontSize: 14,
  },
  warning: {
    background: '#451a03',
    color: '#fbbf24',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 12,
  },
  success: {
    background: '#052e16',
    color: '#4ade80',
    borderRadius: 8,
    padding: '12px 14px',
    marginTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
  },
  hash: {
    fontSize: 11,
    wordBreak: 'break-all',
    color: '#86efac',
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    marginTop: 8,
  },
};
