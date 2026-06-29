'use client';

import { useEffect, useState } from 'react';
import QRCodegen from 'qrcode';

export function QRCode({ value, size = 180 }: { value: string; size?: number }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    QRCodegen.toDataURL(value, {
      margin: 1,
      width: size * 2,
      color: { dark: '#0A0A0F', light: '#FFFFFF' },
    })
      .then(setUrl)
      .catch(() => {});
  }, [value, size]);

  if (!url) {
    return (
      <div
        style={{ width: size, height: size }}
        className="animate-pulse rounded-2xl bg-surface-raised"
      />
    );
  }

  return (
    <div className="rounded-2xl bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} width={size} height={size} alt="Address QR code" />
    </div>
  );
}
