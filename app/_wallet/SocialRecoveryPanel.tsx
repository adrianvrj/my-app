'use client';

import { ShieldCheck } from '@phosphor-icons/react';
import { useCavos } from '@cavos/kit/react';
import { Button, Notice } from './ui';

function formatReadyAt(readyAt: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(readyAt * 1000));
}

/**
 * Social recovery is policy-driven: this demo pins Google in both its modal
 * config and its Cavos development environment. Enrollment and restoration are
 * orchestrated by CavosProvider after a fresh Google credential is received.
 */
export function SocialRecoveryPanel() {
  const { authError, clearAuthError, openModal, walletStatus } = useCavos();
  const readyAt = walletStatus.socialRecoveryReadyAt;

  let title = 'Google recovery is configured';
  let body =
    'A fresh Google sign-in enrolls this wallet automatically through the attested Confidential Space workload.';

  if (walletStatus.isSocialRecovering) {
    title = walletStatus.needsDeviceApproval
      ? 'Restoring this device'
      : 'Securing recovery in the background';
    body = walletStatus.needsDeviceApproval
      ? 'Waiting for recovery setup to finish, then this device will be restored automatically.'
      : 'Your wallet is ready to use. Recovery setup continues automatically and resumes if the browser temporarily pauses it.';
  } else if (readyAt) {
    title = 'Recovery is scheduled';
    body = `The chain timelock will allow this device at ${formatReadyAt(readyAt)}.`;
  } else if (walletStatus.needsDeviceApproval) {
    title = 'This device needs recovery';
    body =
      'Continue with the same Google account. No passkey, recovery phrase, or previously registered device is required.';
  } else if (walletStatus.isReady) {
    body =
      'To test restoration, open this route in a private window or another browser and sign in with the same Google account.';
  }

  return (
    <section className="px-5 pb-4">
      <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
            <ShieldCheck size={20} weight="fill" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold text-ink">Social recovery</p>
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted ring-1 ring-line">
                Google · TEE
              </span>
            </div>
            <p className="mt-2 text-[13px] font-medium text-ink-secondary">{title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{body}</p>
          </div>
        </div>

        {walletStatus.needsDeviceApproval && !walletStatus.isSocialRecovering && !readyAt && (
          <Button className="mt-4 w-full" variant="secondary" onClick={openModal}>
            Continue with Google
          </Button>
        )}

        {authError && (
          <div className="mt-4">
            <Notice tone="error">
              <span className="flex flex-col gap-2">
                <span>{authError}</span>
                <button
                  type="button"
                  className="w-fit text-[12px] font-semibold underline underline-offset-2"
                  onClick={clearAuthError}
                >
                  Dismiss
                </button>
              </span>
            </Notice>
          </div>
        )}
      </div>
    </section>
  );
}
