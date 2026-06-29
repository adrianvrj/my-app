'use client';

import { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { Button, Field, MaxButton, Notice } from './ui';

export interface SendToken {
  symbol: string;
  decimals: number;
  /** Raw balance in base units, formatted for display. */
  displayBalance: string;
}

export function SendForm({
  tokens,
  defaultSymbol,
  onSend,
  busy,
  disabled,
  recipientLabel,
  recipientPlaceholder,
}: {
  tokens: SendToken[];
  defaultSymbol: string;
  onSend: (recipient: string, amount: string, symbol: string) => Promise<void>;
  busy: boolean;
  disabled?: boolean;
  recipientLabel?: string;
  recipientPlaceholder?: string;
}) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const current = tokens.find((t) => t.symbol === symbol) ?? tokens[0];

  const handleSend = async () => {
    setError(null);
    if (!recipient.trim()) {
      setError('Enter a destination address.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setWorking(true);
    try {
      await onSend(recipient.trim(), amount, symbol);
      setRecipient('');
      setAmount('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const isBusy = busy || working;

  return (
    <div className="flex flex-col gap-4">
      {/* Token selector */}
      {tokens.length > 1 && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink-secondary">Token</span>
          <div className="relative">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full appearance-none rounded-xl bg-surface px-4 py-3 pr-10 text-[15px] font-medium text-ink outline-none ring-1 ring-line transition focus:ring-2 focus:ring-accent/50"
            >
              {tokens.map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
            <CaretDown
              size={16}
              weight="bold"
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
          </div>
        </label>
      )}

      {/* Recipient */}
      <Field
        label={recipientLabel ?? 'Recipient'}
        value={recipient}
        onChange={setRecipient}
        placeholder={recipientPlaceholder ?? '0x…'}
        mono
      />

      {/* Amount + Max */}
      <Field
        label={`Amount (${symbol})`}
        value={amount}
        onChange={setAmount}
        placeholder="0.0"
        rightAction={
          <MaxButton
            onClick={() => {
              if (current && current.displayBalance && current.displayBalance !== '—') {
                setAmount(current.displayBalance);
              }
            }}
          />
        }
      />

      {current && (
        <p className="text-[12px] text-ink-muted">
          Available: <span className="font-medium text-ink-secondary">{current.displayBalance}</span> {symbol}
        </p>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      <Button onClick={handleSend} disabled={isBusy || disabled} className="mt-1 w-full">
        {isBusy ? 'Sending…' : 'Send'}
      </Button>
    </div>
  );
}
