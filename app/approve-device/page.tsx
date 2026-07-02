'use client';

import { useEffect, useState, useCallback } from 'react';
import { HttpRecoveryClient, type PendingDeviceRequest } from '@cavos/kit';
import { CavosProvider, useCavos, type CavosModalConfig } from '@cavos/kit/react';
import { starknetConfig } from '../_wallet/config';

// Cavos backend base URL — used by HttpRecoveryClient to confirm the addition.
const BACKEND_URL = process.env.NEXT_PUBLIC_CAVOS_AUTH_BACKEND_URL || 'https://cavos.xyz';

const modal: CavosModalConfig = { appName: 'Cavos', theme: 'dark', emailMode: 'otp' };

const btn: React.CSSProperties = {
  padding: '12px 18px', borderRadius: 999, border: '1px solid #000',
  background: '#000', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14,
};
const card: React.CSSProperties = { border: '1px solid #eee', borderRadius: 16, padding: 24 };

/**
 * Resolve the request id. The "Sign in to approve" step redirects to Google/Apple
 * which returns with ?auth_data=…, overwriting ?request=. Persist the id in
 * sessionStorage so it survives that OAuth round-trip.
 */
function useRequestId(): { requestId: string | null } {
  const [requestId, setRequestId] = useState<string | null>(null);
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('request') || '';
    const STASH = 'cavos.approve.requestId';
    if (fromUrl) {
      sessionStorage.setItem(STASH, fromUrl);
      setRequestId(fromUrl);
    } else {
      setRequestId(sessionStorage.getItem(STASH) || '');
    }
  }, []);
  return { requestId };
}

/**
 * Fetch a pending device-addition request from the backend. The CavosConfig
 * (appSalt etc.) is NOT taken from here — it comes from the local wallet config
 * (../_wallet/config), which is the source of truth for this app's identity.
 */
async function fetchRequest(
  requestId: string,
): Promise<{ request: PendingDeviceRequest } | { error: string }> {
  const url = new URL('/api/devices/request', BACKEND_URL);
  url.searchParams.set('id', requestId);
  const rawRes = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  if (!rawRes.ok) return { error: `Failed to load request (${rawRes.status}).` };
  const data = await rawRes.json();
  if (!data.found) return { error: 'Request not found.' };

  const status = data.status as PendingDeviceRequest['status'];
  if (status === 'expired') return { error: 'This approval link has expired.' };

  const request: PendingDeviceRequest = {
    requestId: data.request_id,
    appId: data.app_id,
    userId: '',
    accountAddress: data.wallet_address,
    newSigner: { x: BigInt(data.new_pub_x), y: BigInt(data.new_pub_y) },
    createdAt: data.created_at,
    status,
  };

  return { request };
}

export default function ApproveDevicePage() {
  const { requestId } = useRequestId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [request, setRequest] = useState<PendingDeviceRequest | null>(null);

  useEffect(() => {
    if (requestId === null) return; // still resolving
    if (!requestId) {
      setError('Missing request id.');
      setLoading(false);
      return;
    }
    fetchRequest(requestId)
      .then((res) => {
        if ('error' in res) setError(res.error);
        else setRequest(res.request);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [requestId]);

  if (loading) {
    return (
      <main style={{ maxWidth: 560, margin: '0 auto', padding: 24, fontFamily: 'var(--font-geist-sans), sans-serif' }}>
        <h1 style={{ fontSize: 22 }}>Approve a new device</h1>
        <p style={{ color: '#666' }}>Loading request…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ maxWidth: 560, margin: '0 auto', padding: 24, fontFamily: 'var(--font-geist-sans), sans-serif' }}>
        <h1 style={{ fontSize: 22 }}>Approve a new device</h1>
        <div style={{ ...card, color: '#b00' }}>{error}</div>
      </main>
    );
  }

  if (!request) return null;

  // Already approved — show success without mounting a provider.
  if (request.status === 'approved') {
    return (
      <main style={{ maxWidth: 560, margin: '0 auto', padding: 24, fontFamily: 'var(--font-geist-sans), sans-serif' }}>
        <h1 style={{ fontSize: 22 }}>Approve a new device</h1>
        <div style={card}>
          <h2 style={{ marginTop: 0, color: '#16a34a' }}>✓ Device approved</h2>
          <p style={{ color: '#555' }}>The new device can now access your account. You can close this page.</p>
        </div>
      </main>
    );
  }

  // Use the SAME config the wallet (/_wallet) uses — it has the correct
  // appSalt ('cavos-super-wallet-4') that this wallet was created under, so the
  // approving device is recognized as an authorized signer. We deliberately do
  // NOT use the `app_salt` from the backend (that's a derived hex that doesn't
  // match the literal string the SDK derived the address with).
  return (
    <CavosProvider config={starknetConfig} modal={modal}>
      <Approve initialRequest={request} />
    </CavosProvider>
  );
}

function Approve({ initialRequest }: { initialRequest: PendingDeviceRequest }) {
  const { isAuthenticated, user, addSigner, openModal } = useCavos();
  const request = initialRequest;
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const approve = useCallback(async () => {
    if (!request) return;
    setBusy(true);
    setError('');
    try {
      // add_signer(new_pubkey) — signed gaslessly by THIS (registered) device's key.
      const res = await addSigner(request.newSigner);
      // Mirror the on-chain state in the backend relay.
      const recovery = new HttpRecoveryClient({ baseUrl: BACKEND_URL, appId: request.appId ?? '' });
      await recovery.confirmDeviceAddition({ requestId: request.requestId, txHash: res.transactionHash });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [request, addSigner]);

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: 24, fontFamily: 'var(--font-geist-sans), sans-serif' }}>
      <h1 style={{ fontSize: 22 }}>Approve a new device</h1>

      {error && <div style={{ ...card, color: '#b00', marginBottom: 16 }}>{error}</div>}

      {done && (
        <div style={card}>
          <h2 style={{ marginTop: 0, color: '#16a34a' }}>✓ Device approved</h2>
          <p style={{ color: '#555' }}>The new device can now access your account. You can close this page.</p>
        </div>
      )}

      {!done && request && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <p style={{ color: '#555', marginTop: 0 }}>
              Someone is trying to add a new device to your account.
            </p>
          </div>

          {!isAuthenticated ? (
            <div style={card}>
              <p style={{ color: '#555' }}>
                To approve this device, sign in from a device that already has access to your account.
              </p>
              <button style={btn} onClick={openModal}>Sign in to approve</button>
            </div>
          ) : (
            <div style={card}>
              <p style={{ color: '#555' }}>
                {user?.email ? <>You&apos;re signed in as <strong>{user.email}</strong>.</> : <>You&apos;re signed in.</>}
                {' '}Approving will give the new device access to your account.
              </p>
              <button style={btn} disabled={busy} onClick={approve}>
                {busy ? 'Approving…' : 'Approve device'}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
