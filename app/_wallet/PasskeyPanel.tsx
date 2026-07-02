'use client';

import { useState } from 'react';
import { useCavos } from '@cavos/kit/react';
import {
  PasskeySigner,
  approveDeviceEverywhere,
  type CavosSolana,
  type CavosStellar,
  type PasskeyApprovable,
} from '@cavos/kit';

// Optional override of the WebAuthn RP ID (the registrable domain). Set it when
// serving from a tunnel/domain; passkeys can't use a bare IP address.
const RP_ID = process.env.NEXT_PUBLIC_CAVOS_RP_ID || '';

type AnyWallet = {
  chain: 'starknet' | 'solana' | 'stellar';
  status: string;
  addApprover: (pubkey: { x: bigint; y: bigint }) => Promise<{ transactionHash?: string }>;
  enrollPasskey: (
    p: PasskeySigner,
    params: { userId: string; userName: string },
  ) => Promise<{ publicKey: { x: bigint; y: bigint }; transactionHash?: string }>;
  approveThisDeviceWithPasskey: (arg: PasskeySigner | { passkey: PasskeySigner }) => Promise<unknown>;
};

/**
 * Passkey "device approvals" across ALL THREE chains. Each chain is a separate
 * account with its own signer set, so a device (and the passkey approver) must be
 * registered per chain. We enroll ONE passkey and register it on every chain;
 * approving a new device runs one assertion per chain that still needs it.
 */
export function PasskeyPanel({
  solana,
  stellar,
}: {
  solana?: CavosSolana | null;
  stellar?: CavosStellar | null;
}) {
  const { wallet, user } = useCavos();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const starknet = wallet?.chain === 'starknet' ? wallet : null;
  const wallets = [starknet, solana, stellar].filter(Boolean) as unknown as AnyWallet[];
  if (wallets.length === 0) return null;

  const rpName = 'Cavos Super Wallet';
  const name = user?.email || user?.userId || 'Cavos user';
  const userId = user?.userId || 'cavos-user';

  const needing = wallets.filter((w) => w.status === 'needs-device-approval');
  const ready = wallets.filter((w) => w.status === 'ready');
  const needsApproval = needing.length > 0;

  async function onEnroll() {
    setBusy(true);
    setMsg(null);
    try {
      const passkey = new PasskeySigner({ rpName, ...(RP_ID ? { rpId: RP_ID } : {}) });
      // Enroll ONE passkey (single OS prompt), then register its pubkey on every
      // ready chain — no extra prompts.
      const [first, ...rest] = ready;
      const { publicKey } = await first.enrollPasskey(passkey, { userId, userName: name });
      for (const w of rest) await w.addApprover(publicKey);
      setMsg(`Passkey habilitado en ${ready.length} red(es) ✓`);
    } catch (e: unknown) {
      setMsg(`Enroll falló: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onApprove() {
    setBusy(true);
    setMsg(null);
    try {
      const passkey = new PasskeySigner({ rpName, ...(RP_ID ? { rpId: RP_ID } : {}) });
      // ONE passkey prompt authorizes this device on every chain that needs it
      // (batched challenge). All sponsor automatically (paymaster / relayer).
      const results = await approveDeviceEverywhere(needing as unknown as PasskeyApprovable[], passkey);
      setMsg(`Device aprobado en ${results.length} red(es) ✓ — recarga para usarlo`);
    } catch (e: unknown) {
      setMsg(`Aprobación falló: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-5 mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-medium">Device approvals</p>
      <p className="mt-1 text-xs text-white/50">
        {needsApproval
          ? `Este navegador no está autorizado en ${needing.length} red(es). Apruébalo con tu passkey — sin volver al dispositivo original.`
          : 'Habilita un passkey para poder agregar dispositivos desde cualquier navegador (en las 3 redes).'}
      </p>
      <button
        type="button"
        disabled={busy || (needsApproval ? needing.length === 0 : ready.length === 0)}
        onClick={needsApproval ? onApprove : onEnroll}
        className="mt-3 w-full rounded-xl bg-accent/90 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy
          ? 'Procesando…'
          : needsApproval
            ? `Aprobar este dispositivo (${needing.length} red${needing.length > 1 ? 'es' : ''})`
            : 'Habilitar device approvals'}
      </button>
      {msg && <p className="mt-2 text-xs text-white/60">{msg}</p>}
    </div>
  );
}
