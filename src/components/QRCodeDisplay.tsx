'use client';

import React, { useEffect, useState } from 'react';
import { generateQRCodeDataURL } from '@/lib/qrcode';
import { Button } from '@/components/ui/Button';

interface QRCodeDisplayProps {
  tokenId: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ tokenId }) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    generateQRCodeDataURL(tokenId).then(setDataUrl).catch(console.error);
  }, [tokenId]);

  if (!dataUrl) return <p>Loading QR Code...</p>;

  return (
    <div className="flex flex-col items-center space-y-4">
      <img src={dataUrl} alt="Certificate QR Code" className="w-48 h-48" />
      <Button 
        onClick={() => {
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = `qrcode-${tokenId}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
        variant="secondary"
      >
        Download QR
      </Button>
    </div>
  );
};
