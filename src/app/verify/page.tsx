'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { QRCodeScanner } from '@/components/QRCodeScanner';
import { useContract } from '@/hooks/useContract';

export default function VerifyPage() {
  const [tokenId, setTokenId] = useState('');
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();
  const { checkExists, checkCertificateValid, checkRevoked } = useContract();

  const handleVerify = async (id: string = tokenId) => {
    const cleaned = id.trim();
    const isNumericTokenId = /^\d+$/.test(cleaned);

    if (!cleaned) {
      setError('Token ID wajib diisi.');
      return;
    }

    if (!isNumericTokenId) {
      setError('Token ID harus berupa angka.');
      return;
    }

    setError(null);
    setIsChecking(true);
    try {
      const exists = await checkExists(cleaned);
      if (!exists) {
        setError('Sertifikat tidak ditemukan di blockchain.');
        return;
      }

      const [isValid, isRevoked] = await Promise.all([
        checkCertificateValid(cleaned),
        checkRevoked(cleaned),
      ]);

      if (!isValid || isRevoked) {
        setError('Sertifikat ditemukan, tetapi statusnya tidak valid/revoked.');
        return;
      }

      router.push(`/verify/${cleaned}`);
    } catch (e) {
      console.error('Pre-check verifikasi gagal', e);
      setError('Gagal verifikasi ke blockchain. Coba lagi.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white p-8 rounded shadow max-w-md w-full space-y-6">
        <h1 className="text-2xl font-bold text-center">Verifikasi Sertifikat</h1>
        {error && (
          <div className="px-3 py-2 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <div className="flex justify-center space-x-4 mb-4">
          <Button 
            variant={mode === 'scan' ? 'primary' : 'secondary'} 
            onClick={() => setMode('scan')}
          >
            Scan QR
          </Button>
          <Button 
            variant={mode === 'manual' ? 'primary' : 'secondary'} 
            onClick={() => setMode('manual')}
          >
            Input Manual
          </Button>
        </div>

        {mode === 'scan' ? (
          <div>
            <QRCodeScanner onScan={handleVerify} />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-medium">Token ID</label>
              <input 
                 type="text" 
                 className="w-full border p-2 rounded" 
                 value={tokenId} 
                 onChange={e => setTokenId(e.target.value)} 
                 placeholder="Masukkan Token ID Sertifikat"
              />
            </div>
            <Button className="w-full" onClick={() => handleVerify(tokenId)}>
              {isChecking ? 'Memeriksa Blockchain...' : 'Verifikasi Sertifikat'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
