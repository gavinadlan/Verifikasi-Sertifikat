import React from 'react';
import { VerificationResult as VerificationResultType } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export const VerificationResult: React.FC<{ result: VerificationResultType }> = ({ result }) => {
  // ── Sertifikat DIREVOKASI: lencana jingga (Tabel 4.6 No.3) ────────────────
  // Dibedakan dari "tidak ditemukan" (merah): sertifikat ini pernah sah dan
  // datanya tetap tercatat di blockchain, tetapi telah dicabut oleh issuer.
  if (!result.isValid && result.isRevoked) {
    const cert = result.certificate;
    return (
      <Card className="border-orange-500">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-orange-600">Sertifikat Telah Direvokasi</h2>
          <Badge variant="warning">Direvokasi oleh Penerbit</Badge>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Sertifikat ini pernah diterbitkan secara sah, tetapi telah dicabut
          (revoked) oleh penerbit sehingga tidak lagi berlaku.
        </p>
        {cert && (
          <div className="space-y-2">
            <p><strong>Nomor Sertifikat:</strong> {cert.certificateNumber}</p>
            <p><strong>Penerima:</strong> {cert.recipientName}</p>
            <p><strong>Nama Event:</strong> {cert.eventTitle}</p>
            <p><strong>Penyelenggara:</strong> {cert.organizerName}</p>
            <p><strong>Tanggal:</strong> {cert.issueDate}</p>
            <p className="border-t pt-2 mt-2 break-all">
              <strong>Token ID:</strong> {cert.tokenId}<br/>
              <strong>Alamat Penerbit:</strong> {cert.issuerAddress}<br/>
            </p>
          </div>
        )}
        <p className="text-sm text-gray-500 mt-4">Diverifikasi pada: {result.verifiedAt}</p>
      </Card>
    );
  }

  // ── Tidak ditemukan / tidak valid: lencana merah (Tabel 4.6 No.4) ─────────
  if (!result.isValid) {
    return (
      <Card className="border-red-500">
        <h2 className="text-xl font-bold text-red-600 mb-2">Verifikasi Gagal</h2>
        <p>{result.error || "Sertifikat tidak valid atau tidak ditemukan."}</p>
        <p className="text-sm text-gray-500 mt-4">Diverifikasi pada: {result.verifiedAt}</p>
      </Card>
    );
  }

  const cert = result.certificate;
  const roleVariant = cert?.recipientRole === 'Pembicara'
    ? 'warning'
    : cert?.recipientRole === 'Panitia'
      ? 'info'
      : 'success';

  return (
    <Card className="border-green-500">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold text-green-600">Sertifikat Valid</h2>
        <Badge variant="success">Terverifikasi On-Chain</Badge>
      </div>
      
      {cert && (
        <div className="space-y-2">
          <p><strong>Nomor Sertifikat:</strong> {cert.certificateNumber}</p>
          <p><strong>Penerima:</strong> {cert.recipientName}</p>
          <p>
            <strong>Peran Peserta:</strong>{' '}
            <Badge variant={roleVariant}>{cert.recipientRole}</Badge>
          </p>
          <p><strong>Nama Event:</strong> {cert.eventTitle}</p>
          {cert.eventTheme && <p><strong>Tema Event:</strong> {cert.eventTheme}</p>}
          <p><strong>Penyelenggara:</strong> {cert.organizerName}</p>
          <p><strong>Tanggal:</strong> {cert.issueDate}</p>
          <p className="border-t pt-2 mt-2 break-all">
            <strong>Token ID:</strong> {cert.tokenId}<br/>
            <strong>Alamat Penerbit:</strong> {cert.issuerAddress}<br/>
          </p>
        </div>
      )}
      <p className="text-sm text-gray-500 mt-4">Diverifikasi pada: {result.verifiedAt}</p>
    </Card>
  );
};
