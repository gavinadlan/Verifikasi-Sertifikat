'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { VerificationResult as VerificationResultComponent } from '@/components/VerificationResult';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { VerificationResult as VerificationResultType } from '@/types';
import { useContract } from '@/hooks/useContract';
import { IPFS_GATEWAY, POLYGONSCAN_URL } from '@/constants';
import { CertificateSignatureData, SignatureVerificationResult } from '@/lib/signCertificate';
import { ukurWaktuVerifikasi } from '@/lib/verificationTiming';

export default function TokenVerificationPage() {
  const params = useParams();
  const tokenId = params.tokenId as string;
  const {
    getTokenURI,
    getOwner,
    checkExists,
    checkCertificateValid,
    checkRevoked,
    verifyIssuerSignature,  // ← REVISI: tambah fungsi verifikasi signature
  } = useContract();

  const [result, setResult] = useState<VerificationResultType | null>(null);
  const [loading, setLoading] = useState(true);

  // ── REVISI: State untuk hasil verifikasi digital signature ────────────────
  const [sigVerification, setSigVerification] = useState<SignatureVerificationResult | null>(null);
  const [sigLoading, setSigLoading] = useState(false);
  // Guard agar pengukuran KPI tidak tercatat dobel (React dev mode
  // menjalankan useEffect dua kali).
  const timingMeasuredRef = useRef<string | null>(null);
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function verify() {
      if (!tokenId) return;
      try {
        // Step 1: Check if the token exists on-chain
        const tokenExists = await checkExists(tokenId);
        if (!tokenExists) {
          setResult({
            isValid: false,
            verifiedAt: new Date().toISOString(),
            error: 'Sertifikat tidak ditemukan. Token ID ini tidak ada di blockchain.',
          });
          return;
        }

        // Step 2: Check revocation status
        const isRevoked = await checkRevoked(tokenId);

        // Step 3: Check overall validity
        const isValid = await checkCertificateValid(tokenId);

        // Step 4: Fetch on-chain data
        const tokenURI = await getTokenURI(tokenId);
        const owner = await getOwner(tokenId);

        // Step 5: Fetch metadata from IPFS
        const cleanCID = tokenURI.replace('ipfs://', '');
        const metaRes = await fetch(`${IPFS_GATEWAY}${cleanCID}`);
        const metadata = await metaRes.json();

        const getAttr = (trait: string) =>
          metadata.attributes?.find((a: any) => a.trait_type === trait)?.value || '';

        // Step 6: Retrieve the actual transaction hash from CertificateMinted event
        let transactionHash = '';
        try {
          const { getReadOnlyContract } = await import('@/lib/contract');
          const contract = getReadOnlyContract();
          const filter = contract.filters.CertificateMinted(tokenId);
          const logs = await contract.queryFilter(filter, 0, 'latest');
          if (logs.length > 0) {
            transactionHash = logs[0].transactionHash;
          }
        } catch (e) {
          console.error('Failed to fetch transaction hash from logs:', e);
        }

        const certData = {
          tokenId: tokenId,
          ownerAddress: owner,
          issuerAddress: getAttr('Issuer Wallet') || 'Unknown',
          tokenURI: tokenURI,
          transactionHash: transactionHash,
          blockNumber: 0,
          recipientName: getAttr('Nama Penerima') || 'Unknown Participant',
          recipientRole: (getAttr('Peran') || 'Peserta') as 'Peserta' | 'Pembicara' | 'Panitia',
          eventTitle: getAttr('Nama Event') || 'Event Tidak Diketahui',
          eventTheme: getAttr('Tema Event') || '',
          issueDate: getAttr('Tanggal Penerbitan') || 'Tanggal Tidak Diketahui',
          organizerName: getAttr('Penyelenggara') || 'Penyelenggara Tidak Diketahui',
          certificateNumber:
            getAttr('Nomor Sertifikat') ||
            `CERT-${new Date().getFullYear()}-${tokenId.padStart(3, '0')}`,
          pdfCID: metadata.image ? metadata.image.replace('ipfs://', '') : '',
          metadataCID: cleanCID,
          isRevoked,
        };

        setResult({
          isValid,
          isRevoked,
          verifiedAt: new Date().toISOString(),
          certificate: certData,
        });

        // ── REVISI: Step 7 — Verifikasi Digital Signature ─────────────────
        // Lakukan verifikasi signature secara terpisah agar tidak memperlambat
        // loading data utama. Hasilnya ditampilkan sebagai panel tambahan.
        if (isValid && !isRevoked) {
          setSigLoading(true);
          try {
            // Bangun signatureData dari metadata yang sudah diambil.
            // Field-field ini HARUS IDENTIK dengan yang digunakan saat minting
            // di fungsi processMinting() di issue/page.tsx
            const signatureData: CertificateSignatureData = {
              recipientName: getAttr('Nama Penerima'),
              eventTitle: getAttr('Nama Event'),
              issueDate: getAttr('Tanggal Penerbitan'),
              role: getAttr('Peran'),
              recipientWalletAddress: (getAttr('Recipient Wallet') || owner).toLowerCase(), // REVISI: dari metadata IPFS bukan ownerOf()
              certificateNumber: getAttr('Nomor Sertifikat'),
            };

            const sigResult = await verifyIssuerSignature(tokenId, signatureData);
            setSigVerification(sigResult);
          } catch (sigErr) {
            console.error('Signature verification error:', sigErr);
            setSigVerification({
              isValid: false,
              recoveredAddress: '',
              expectedIssuer: '',
              message: 'Gagal memverifikasi tanda tangan digital.',
            });
          } finally {
            setSigLoading(false);
          }
        }
        // ─────────────────────────────────────────────────────────────────
      } catch (err: any) {
        console.error('Error verifikasi:', err);
        setResult({
          isValid: false,
          verifiedAt: new Date().toISOString(),
          error:
            'Gagal terhubung ke jaringan blockchain (RPC). Muat ulang halaman untuk mencoba lagi.',
        });
      } finally {
        setLoading(false);
      }

      // ── KPI No.1: Pengukuran waktu verifikasi (Tabel 3.2) ──────────────
      // Berjalan terpisah setelah verifikasi utama; hasil muncul di Console
      // browser (F12). Ekspor CSV: ketik exportHasilKeCsv() di Console.
      if (timingMeasuredRef.current === tokenId) return; // sudah diukur
      timingMeasuredRef.current = tokenId;
      try {
        const { getReadOnlyContract } = await import('@/lib/contract');
        const { ethers } = await import('ethers');
        void ukurWaktuVerifikasi({
          tokenId,
          contract: getReadOnlyContract(),
          ipfsGateway: IPFS_GATEWAY,
          ethers,
          metode: 'Token ID Manual',
        }).catch((e) => console.warn('Pengukuran waktu verifikasi gagal:', e));
      } catch (e) {
        console.warn('Pengukuran waktu verifikasi tidak dijalankan:', e);
      }
      // ────────────────────────────────────────────────────────────────────
    }
    verify();
    // Dependency cukup tokenId saja. Fungsi-fungsi hook dibuat ulang setiap
    // render, sehingga jika dimasukkan sebagai dependency, verifikasi berjalan
    // berulang tanpa henti dan memicu rate-limit RPC publik.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full space-y-6">

        {/* Grid utama: hasil verifikasi + QR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Detail Verifikasi</h1>
            {loading ? (
              <p className="animate-pulse">Memverifikasi data blockchain...</p>
            ) : result ? (
              <VerificationResultComponent result={result} />
            ) : null}
          </div>

          <div className="bg-white p-6 rounded shadow flex justify-center">
            <QRCodeDisplay tokenId={tokenId} />
          </div>
        </div>

        {/* ── REVISI: Panel Verifikasi Tanda Tangan Digital ──────────────────── */}
        {!loading && result?.isValid && !result?.isRevoked && (
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            {/* Header panel */}
            <div className="px-6 py-4 border-b border-gray-100 bg-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Verifikasi Tanda Tangan Digital Issuer</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Membuktikan sertifikat benar-benar ditandatangani secara kriptografis oleh issuer yang sah
                </p>
              </div>
            </div>

            {/* Body panel */}
            <div className="px-6 py-5">
              {sigLoading ? (
                /* Loading state */
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <p className="text-sm text-slate-500">Memverifikasi tanda tangan digital dari blockchain...</p>
                </div>
              ) : sigVerification ? (
                sigVerification.isValid ? (
                  /* SUCCESS STATE */
                  <div className="space-y-4">
                    {/* Badge valid */}
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-800">Tanda Tangan Digital VALID</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Sertifikat ini terbukti secara kriptografis diterbitkan oleh issuer yang sah
                        </p>
                      </div>
                    </div>

                    {/* Detail teknis */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Detail Verifikasi Kriptografis
                      </p>

                      <div className="space-y-2.5">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-400">Metode Verifikasi</span>
                          <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            ECDSA secp256k1 (Ethereum eth_sign)
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-400">Address Issuer Terverifikasi</span>
                          <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 break-all">
                            {sigVerification.recoveredAddress}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-400">Address Issuer On-Chain</span>
                          <span className="text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 break-all">
                            {sigVerification.expectedIssuer}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="text-xs text-emerald-700 font-medium">
                            Recovered address cocok dengan issuer on-chain ✓
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Penjelasan awam */}
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <p className="text-xs text-blue-700">
                        <span className="font-semibold">Apa artinya?</span> Tanda tangan digital ini dihasilkan
                        menggunakan private key wallet issuer yang tidak dapat dipalsukan oleh siapapun.
                        Bahkan jika seseorang menyalin seluruh data sertifikat ini ke blockchain lain,
                        tanda tangan ini tidak akan bisa direplikasi tanpa private key asli issuer.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* INVALID STATE */
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-800">Tanda Tangan Digital TIDAK VALID</p>
                        <p className="text-xs text-red-700 mt-0.5">
                          Tidak dapat membuktikan keaslian sertifikat ini
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                      <p className="text-xs text-red-700 font-mono break-all">
                        {sigVerification.message}
                      </p>
                    </div>

                    <p className="text-xs text-slate-500">
                      Ini dapat terjadi jika sertifikat diterbitkan melalui contract lama
                      (sebelum fitur tanda tangan digital ditambahkan) atau jika data
                      sertifikat telah dimanipulasi.
                    </p>
                  </div>
                )
              ) : null}
            </div>
          </div>
        )}
        {/* ─────────────────────────────────────────────────────────────────── */}

      </div>
    </div>
  );
}
