'use client';

import { useEffect, useState } from 'react';
import { hash } from 'starknet';

const SLOT_RPC = 'https://api.cartridge.gg/x/cavos/katana';
const SAMPLE_WALLET_ADDRESS = '0x2e938e0b7d5ca7fb780b934c4f850adc1b858dd46786037a4433bdbd1c65f35';
const MAX_EVENT_PAGES = 24;
const MAX_TXS = 12;

const EVENT_KEYS = {
  TransactionExecuted: hash.getSelectorFromName('TransactionExecuted'),
  SessionRegistered: hash.getSelectorFromName('SessionRegistered'),
  SessionRevoked: hash.getSelectorFromName('SessionRevoked'),
  AllSessionsRevoked: hash.getSelectorFromName('AllSessionsRevoked'),
} as const;

const EVENT_NAME_BY_KEY = Object.fromEntries(
  Object.entries(EVENT_KEYS).map(([name, key]) => [key.toLowerCase(), name]),
) as Record<string, keyof typeof EVENT_KEYS>;

type RpcEvent = {
  block_number?: number;
  block_hash?: string;
  transaction_hash?: string;
  keys?: string[];
  data?: string[];
};

type RpcEventsResult = {
  events: RpcEvent[];
  continuation_token?: string;
};

type ExplorerEvent = {
  type: string;
  blockNumber: number | null;
  transactionHash: string | null;
  keys: string[];
  data: string[];
};

type SessionState = {
  sessionKey: string;
  source: 'current' | 'event';
  registered: boolean;
  active: boolean;
  expired: boolean;
  validAfter: string | null;
  validUntil: string | null;
  renewalDeadline: string | null;
  allowedContractsRoot: string | null;
  maxCallsPerTx: string | null;
};

type TransactionSummary = {
  hash: string;
  blockNumber: number | null;
  type: string;
  senderAddress: string | null;
  executionStatus: string | null;
  finalityStatus: string | null;
  nonce: string | null;
  revertError: string | null;
};

type ExplorerSnapshot = {
  address: string;
  latestBlockNumber: number;
  latestTimestamp: number;
  scanFromBlock: number;
  deployed: boolean;
  classHash: string | null;
  nonce: string | null;
  version: string | null;
  sessionPublicKey: string | null;
  sessions: SessionState[];
  events: ExplorerEvent[];
  transactions: TransactionSummary[];
  truncatedEvents: boolean;
};

interface SlotExplorerProps {
  connectedAddress: string | null;
  currentSessionPublicKey: string | null;
  lastTxHash?: string | null;
}

function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return BigInt(value).toString(16).padStart(1, '0').replace(/^/, '0x').toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function shortHex(value: string | null | undefined, left = 8, right = 6): string {
  if (!value) return '—';
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function safeBigInt(value: string | null | undefined): bigint | null {
  if (!value) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function formatTimestamp(value: number | bigint | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const seconds = typeof value === 'bigint' ? Number(value) : value;
  if (!Number.isFinite(seconds)) return '—';
  return new Date(seconds * 1000).toLocaleString();
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function rpcCall<T>(method: string, params: unknown): Promise<T> {
  const response = await fetch(SLOT_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`RPC HTTP error ${response.status}: ${JSON.stringify(payload)}`);
  }
  if (payload.error) {
    const detail = payload.error.data
      ? ` | ${typeof payload.error.data === 'string' ? payload.error.data : JSON.stringify(payload.error.data)}`
      : '';
    throw new Error(`RPC error [${payload.error.code}]: ${payload.error.message}${detail}`);
  }
  return payload.result as T;
}

async function fetchAccountEvents(address: string, fromBlock: number): Promise<{ events: ExplorerEvent[]; truncated: boolean }> {
  const keyFilter = [[
    EVENT_KEYS.TransactionExecuted,
    EVENT_KEYS.SessionRegistered,
    EVENT_KEYS.SessionRevoked,
    EVENT_KEYS.AllSessionsRevoked,
  ]];

  let continuationToken: string | undefined;
  const events: ExplorerEvent[] = [];
  let truncated = false;

  for (let page = 0; page < MAX_EVENT_PAGES; page += 1) {
    const result = await rpcCall<RpcEventsResult>('starknet_getEvents', {
      filter: {
        from_block: { block_number: fromBlock },
        to_block: 'latest',
        address,
        keys: keyFilter,
        chunk_size: 100,
        ...(continuationToken ? { continuation_token: continuationToken } : {}),
      },
    });

    events.push(
      ...result.events.map(event => ({
        type: EVENT_NAME_BY_KEY[event.keys?.[0]?.toLowerCase() || ''] || 'Unknown',
        blockNumber: event.block_number ?? null,
        transactionHash: event.transaction_hash ?? null,
        keys: event.keys ?? [],
        data: event.data ?? [],
      })),
    );

    if (!result.continuation_token) {
      return {
        events: events.sort((a, b) => (b.blockNumber ?? 0) - (a.blockNumber ?? 0)),
        truncated: false,
      };
    }

    continuationToken = result.continuation_token;
  }

  truncated = true;
  return {
    events: events.sort((a, b) => (b.blockNumber ?? 0) - (a.blockNumber ?? 0)),
    truncated,
  };
}

async function fetchSessionState(
  address: string,
  sessionKey: string,
  currentTimestamp: number,
  source: 'current' | 'event',
): Promise<SessionState> {
  try {
    const result = await rpcCall<string[]>('starknet_call', {
      request: {
        contract_address: address,
        entry_point_selector: hash.getSelectorFromName('get_session'),
        calldata: [sessionKey],
      },
      block_id: 'latest',
    });

    const nonce = safeBigInt(result[0]);
    const validAfter = safeBigInt(result[1]);
    const validUntil = safeBigInt(result[2]);
    const renewalDeadline = safeBigInt(result[3]);
    const registered = nonce !== null && nonce !== BigInt(0);
    const now = BigInt(currentTimestamp);
    const active = registered && validAfter !== null && validUntil !== null && now >= validAfter && now < validUntil;
    const expired = registered && validUntil !== null ? now >= validUntil : false;

    return {
      sessionKey,
      source,
      registered,
      active,
      expired,
      validAfter: result[1] ?? null,
      validUntil: result[2] ?? null,
      renewalDeadline: result[3] ?? null,
      allowedContractsRoot: result[5] ?? null,
      maxCallsPerTx: result[6] ?? null,
    };
  } catch {
    return {
      sessionKey,
      source,
      registered: false,
      active: false,
      expired: false,
      validAfter: null,
      validUntil: null,
      renewalDeadline: null,
      allowedContractsRoot: null,
      maxCallsPerTx: null,
    };
  }
}

async function fetchTransactionSummary(txHash: string): Promise<TransactionSummary> {
  const [transaction, receipt] = await Promise.all([
    rpcCall<any>('starknet_getTransactionByHash', { transaction_hash: txHash }),
    rpcCall<any>('starknet_getTransactionReceipt', { transaction_hash: txHash }),
  ]);

  return {
    hash: txHash,
    blockNumber: receipt.block_number ?? null,
    type: transaction.type ?? 'Unknown',
    senderAddress: transaction.sender_address ?? null,
    executionStatus: receipt.execution_status ?? null,
    finalityStatus: receipt.finality_status ?? null,
    nonce: transaction.nonce ?? null,
    revertError: receipt.revert_error ?? null,
  };
}

async function loadExplorerSnapshot(
  targetAddress: string,
  currentSessionPublicKey: string | null,
  connectedAddress: string | null,
  lookbackBlocks: number,
): Promise<ExplorerSnapshot> {
  const latestBlock = await rpcCall<{ block_number: number; timestamp: number }>(
    'starknet_getBlockWithTxHashes',
    { block_id: 'latest' },
  );

  let classHash: string | null = null;
  let deployed = false;
  try {
    classHash = await rpcCall<string>('starknet_getClassHashAt', {
      block_id: 'latest',
      contract_address: targetAddress,
    });
    deployed = true;
  } catch {
    deployed = false;
  }

  let nonce: string | null = null;
  let version: string | null = null;
  let events: ExplorerEvent[] = [];
  let transactions: TransactionSummary[] = [];
  let sessions: SessionState[] = [];
  let truncatedEvents = false;

  const scanFromBlock = Math.max(0, latestBlock.block_number - lookbackBlocks);

  if (deployed) {
    nonce = await rpcCall<string>('starknet_getNonce', {
      block_id: 'latest',
      contract_address: targetAddress,
    });

    try {
      const versionResult = await rpcCall<string[]>('starknet_call', {
        request: {
          contract_address: targetAddress,
          entry_point_selector: hash.getSelectorFromName('get_version'),
          calldata: [],
        },
        block_id: 'latest',
      });
      version = versionResult[0] ?? null;
    } catch {
      version = null;
    }

    const fetchedEvents = await fetchAccountEvents(targetAddress, scanFromBlock);
    events = fetchedEvents.events;
    truncatedEvents = fetchedEvents.truncated;

    const discoveredSessionKeys = new Map<string, 'current' | 'event'>();
    const normalizedConnectedAddress = normalizeHex(connectedAddress);
    const normalizedTargetAddress = normalizeHex(targetAddress);

    if (normalizedConnectedAddress && normalizedConnectedAddress === normalizedTargetAddress && currentSessionPublicKey) {
      discoveredSessionKeys.set(normalizeHex(currentSessionPublicKey) || currentSessionPublicKey, 'current');
    }

    for (const event of events) {
      if (event.type === 'SessionRegistered' && event.data[0]) {
        const sessionKey = normalizeHex(event.data[0]) || event.data[0];
        if (!discoveredSessionKeys.has(sessionKey)) {
          discoveredSessionKeys.set(sessionKey, 'event');
        }
      }
    }

    sessions = await Promise.all(
      Array.from(discoveredSessionKeys.entries()).map(([sessionKey, source]) =>
        fetchSessionState(targetAddress, sessionKey, latestBlock.timestamp, source),
      ),
    );

    const txHashes = Array.from(
      new Set(events.map(event => event.transactionHash).filter((txHash): txHash is string => Boolean(txHash))),
    ).slice(0, MAX_TXS);

    transactions = await Promise.all(txHashes.map(fetchTransactionSummary));
    transactions.sort((a, b) => (b.blockNumber ?? 0) - (a.blockNumber ?? 0));
  }

  return {
    address: targetAddress,
    latestBlockNumber: latestBlock.block_number,
    latestTimestamp: latestBlock.timestamp,
    scanFromBlock,
    deployed,
    classHash,
    nonce,
    version,
    sessionPublicKey: currentSessionPublicKey,
    sessions,
    events,
    transactions,
    truncatedEvents,
  };
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
    </div>
  );
}

export function SlotExplorer({
  connectedAddress,
  currentSessionPublicKey,
  lastTxHash,
}: SlotExplorerProps) {
  const [targetAddress, setTargetAddress] = useState(SAMPLE_WALLET_ADDRESS);
  const [lookbackBlocks, setLookbackBlocks] = useState('200000');
  const [snapshot, setSnapshot] = useState<ExplorerSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupHash, setLookupHash] = useState('');
  const [lookupTx, setLookupTx] = useState<TransactionSummary | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const refreshExplorer = async (nextAddress?: string) => {
    const addressToUse = (nextAddress ?? targetAddress).trim();
    if (!addressToUse) {
      setError('Enter a wallet address to inspect.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextLookback = Math.max(1, Number.parseInt(lookbackBlocks, 10) || 1);
      const result = await loadExplorerSnapshot(
        addressToUse,
        currentSessionPublicKey,
        connectedAddress,
        nextLookback,
      );
      setSnapshot(result);
      setTargetAddress(addressToUse);
    } catch (nextError) {
      setSnapshot(null);
      setError(describeError(nextError));
    } finally {
      setIsLoading(false);
    }
  };

  const inspectTxHash = async (nextHash?: string) => {
    const txHash = (nextHash ?? lookupHash).trim();
    if (!txHash) {
      setLookupError('Enter a transaction hash to inspect.');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
    try {
      const result = await fetchTransactionSummary(txHash);
      setLookupTx(result);
      setLookupHash(txHash);
    } catch (nextError) {
      setLookupTx(null);
      setLookupError(describeError(nextError));
    } finally {
      setIsLookingUp(false);
    }
  };

  useEffect(() => {
    void refreshExplorer(SAMPLE_WALLET_ADDRESS);
    // Intentionally run once on mount with the sample wallet as the default target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.sectionTitle}>Mini Explorer</h3>
          <p style={styles.muted}>
            Inspect a Slot wallet, its sessions, account events, and related transactions.
          </p>
        </div>
      </div>

      <label style={styles.label}>Wallet address</label>
      <input
        style={styles.input}
        value={targetAddress}
        onChange={event => setTargetAddress(event.target.value)}
        placeholder="0x..."
      />

      <div style={styles.buttonRow}>
        <button style={styles.secondaryBtn} onClick={() => void refreshExplorer()}>
          {isLoading ? 'Refreshing...' : 'Inspect wallet'}
        </button>
        <button
          style={styles.secondaryBtn}
          onClick={() => {
            if (!connectedAddress) return;
            setTargetAddress(connectedAddress);
            void refreshExplorer(connectedAddress);
          }}
          disabled={!connectedAddress || isLoading}
        >
          Use current wallet
        </button>
        <button
          style={styles.secondaryBtn}
          onClick={() => {
            setTargetAddress(SAMPLE_WALLET_ADDRESS);
            void refreshExplorer(SAMPLE_WALLET_ADDRESS);
          }}
          disabled={isLoading}
        >
          Use sample wallet
        </button>
      </div>

      <label style={styles.label}>Lookback blocks</label>
      <input
        style={styles.input}
        type="number"
        min="1"
        step="1000"
        value={lookbackBlocks}
        onChange={event => setLookbackBlocks(event.target.value)}
      />

      {error && <p style={styles.error}>{error}</p>}

      {snapshot && (
        <>
          <div style={styles.cardGrid}>
            <div style={styles.panel}>
              <h4 style={styles.panelTitle}>Account snapshot</h4>
              <DataRow label="Wallet" value={shortHex(snapshot.address, 10, 8)} />
              <DataRow label="Latest block" value={`#${snapshot.latestBlockNumber}`} />
              <DataRow label="Block time" value={formatTimestamp(snapshot.latestTimestamp)} />
              <DataRow label="Scan from" value={`#${snapshot.scanFromBlock}`} />
              <DataRow label="Deployed" value={snapshot.deployed ? 'Yes' : 'No'} />
              <DataRow label="Class hash" value={snapshot.classHash || '—'} />
              <DataRow label="Nonce" value={snapshot.nonce || '—'} />
              <DataRow label="Version" value={snapshot.version || '—'} />
              <DataRow
                label="Current SDK session key"
                value={snapshot.sessionPublicKey ? shortHex(snapshot.sessionPublicKey, 12, 8) : '—'}
              />
            </div>

            <div style={styles.panel}>
              <h4 style={styles.panelTitle}>Session states</h4>
              {snapshot.sessions.length === 0 ? (
                <p style={styles.muted}>No session keys discovered for this wallet in the selected range.</p>
              ) : (
                snapshot.sessions.map(session => (
                  <div key={session.sessionKey} style={styles.itemCard}>
                    <DataRow label="Session key" value={session.sessionKey} />
                    <DataRow label="Source" value={session.source} />
                    <DataRow label="Registered" value={session.registered ? 'Yes' : 'No'} />
                    <DataRow label="Active" value={session.active ? 'Yes' : 'No'} />
                    <DataRow label="Expired" value={session.expired ? 'Yes' : 'No'} />
                    <DataRow label="Valid after" value={formatTimestamp(safeBigInt(session.validAfter))} />
                    <DataRow label="Valid until" value={formatTimestamp(safeBigInt(session.validUntil))} />
                    <DataRow
                      label="Renewal deadline"
                      value={formatTimestamp(safeBigInt(session.renewalDeadline))}
                    />
                    <DataRow label="Allowed root" value={session.allowedContractsRoot || '—'} />
                    <DataRow label="Max calls/tx" value={session.maxCallsPerTx || '—'} />
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={styles.cardGrid}>
            <div style={styles.panel}>
              <h4 style={styles.panelTitle}>Recent account events</h4>
              {snapshot.truncatedEvents && (
                <p style={styles.warning}>
                  Event scan was truncated after {MAX_EVENT_PAGES} pages. Increase the lookback or narrow the range if
                  you need older history.
                </p>
              )}
              {snapshot.events.length === 0 ? (
                <p style={styles.muted}>No account events found in the selected block range.</p>
              ) : (
                snapshot.events.map((event, index) => (
                  <div key={`${event.transactionHash || 'event'}-${index}`} style={styles.itemCard}>
                    <DataRow label="Type" value={event.type} />
                    <DataRow label="Block" value={event.blockNumber !== null ? `#${event.blockNumber}` : '—'} />
                    <DataRow label="Tx hash" value={event.transactionHash || '—'} />
                    <DataRow label="Keys" value={event.keys.join(', ') || '—'} />
                    <DataRow label="Data" value={event.data.join(', ') || '—'} />
                  </div>
                ))
              )}
            </div>

            <div style={styles.panel}>
              <h4 style={styles.panelTitle}>Related successful transactions</h4>
              {snapshot.transactions.length === 0 ? (
                <p style={styles.muted}>No successful account transactions were discovered from account events.</p>
              ) : (
                snapshot.transactions.map(tx => (
                  <div key={tx.hash} style={styles.itemCard}>
                    <DataRow label="Tx hash" value={tx.hash} />
                    <DataRow label="Block" value={tx.blockNumber !== null ? `#${tx.blockNumber}` : '—'} />
                    <DataRow label="Type" value={tx.type} />
                    <DataRow label="Sender" value={tx.senderAddress || '—'} />
                    <DataRow label="Execution" value={tx.executionStatus || '—'} />
                    <DataRow label="Finality" value={tx.finalityStatus || '—'} />
                    <DataRow label="Nonce" value={tx.nonce || '—'} />
                    <DataRow label="Revert" value={tx.revertError || '—'} />
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div style={styles.panel}>
        <h4 style={styles.panelTitle}>Tx hash lookup</h4>
        <label style={styles.label}>Transaction hash</label>
        <input
          style={styles.input}
          value={lookupHash}
          onChange={event => setLookupHash(event.target.value)}
          placeholder="0x..."
        />
        <div style={styles.buttonRow}>
          <button style={styles.secondaryBtn} onClick={() => void inspectTxHash()} disabled={isLookingUp}>
            {isLookingUp ? 'Loading tx...' : 'Inspect tx'}
          </button>
          <button
            style={styles.secondaryBtn}
            onClick={() => {
              if (!lastTxHash) return;
              setLookupHash(lastTxHash);
              void inspectTxHash(lastTxHash);
            }}
            disabled={!lastTxHash || isLookingUp}
          >
            Inspect last Slot tx
          </button>
        </div>

        {lookupError && <p style={styles.error}>{lookupError}</p>}
        {lookupTx && (
          <div style={styles.itemCard}>
            <DataRow label="Tx hash" value={lookupTx.hash} />
            <DataRow label="Block" value={lookupTx.blockNumber !== null ? `#${lookupTx.blockNumber}` : '—'} />
            <DataRow label="Type" value={lookupTx.type} />
            <DataRow label="Sender" value={lookupTx.senderAddress || '—'} />
            <DataRow label="Execution" value={lookupTx.executionStatus || '—'} />
            <DataRow label="Finality" value={lookupTx.finalityStatus || '—'} />
            <DataRow label="Nonce" value={lookupTx.nonce || '—'} />
            <DataRow label="Revert" value={lookupTx.revertError || '—'} />
          </div>
        )}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: 28,
    borderTop: '1px solid #334155',
    paddingTop: 20,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
    marginTop: 0,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#f8fafc',
    marginTop: 0,
    marginBottom: 12,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 16,
    marginBottom: 16,
  },
  panel: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  itemCard: {
    background: '#111827',
    border: '1px solid #334155',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 8,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    display: 'block',
    marginBottom: 4,
  },
  value: {
    fontSize: 12,
    color: '#f8fafc',
    wordBreak: 'break-all',
    textAlign: 'right',
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
  buttonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  secondaryBtn: {
    background: '#1d4ed8',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  muted: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 0,
    marginBottom: 12,
  },
  error: {
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 12,
  },
  warning: {
    color: '#fcd34d',
    fontSize: 13,
    marginBottom: 12,
  },
};
