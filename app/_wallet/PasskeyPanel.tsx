'use client';

import { useState } from 'react';
import { useCavos } from '@cavos/kit/react';

/**
 * Passkey "device approvals" for the CONNECTED chain. Enroll a passkey once so
 * this account can add new devices from any browser; on a fresh device, approve
 * it with that passkey — no trip back to the original device. Single-chain: the
 * provider handles exactly one chain, so there's no cross-chain orchestration.
 */
export function PasskeyPanel() {
  const { walletStatus, passkeySupported, enrollPasskeyDefault, approveDeviceWithPasskey } = useCavos();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const needsApproval = walletStatus.needsDeviceApproval;
  const ready = walletStatus.isReady;

  // Nothing to do until the wallet is connected in one of these two states.
  if (!needsApproval && !ready) return null;
  if (!passkeySupported) return null;

  async function onEnroll() {
    setBusy(true);
    setMsg(null);
    try {
      await enrollPasskeyDefault();
      setMsg('Passkey habilitado ✓');
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
      await approveDeviceWithPasskey();
      setMsg('Device aprobado ✓');
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
          ? 'Este navegador no está autorizado. Apruébalo con tu passkey — sin volver al dispositivo original.'
          : 'Habilita un passkey para agregar dispositivos desde cualquier navegador.'}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={needsApproval ? onApprove : onEnroll}
        className="mt-3 w-full rounded-xl bg-accent/90 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Procesando…' : needsApproval ? 'Aprobar este dispositivo' : 'Habilitar device approvals'}
      </button>
      {msg && <p className="mt-2 text-xs text-white/60">{msg}</p>}
    </div>
  );
}
