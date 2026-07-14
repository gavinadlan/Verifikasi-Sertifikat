'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { useIPFS } from '@/hooks/useIPFS';
import { useContract } from '@/hooks/useContract';
import { buildNFTMetadata, generateCertificateNumber } from '@/lib/metadata';
import { downloadCSVTemplate, parseParticipantsCSV } from '@/lib/csv';
import { APP_URL, CHAIN_ID } from '@/constants';
import QRCode from 'qrcode';
import {
  CertificateSignatureData,
} from '@/lib/signCertificate';
import StepIndicator from '@/components/dashboard/issue/StepIndicator';
import DropZone from '@/components/dashboard/issue/DropZone';
import IssueForm, { IssueFormData as FormData } from '@/components/dashboard/issue/IssueForm';

// ── Certificate Preview Card ──────────────────────────────────────
function CertificatePreview({ file }: { file: File | null }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!file || !previewUrl) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 shadow-sm flex flex-col items-center justify-center gap-3"
        style={{ minHeight: 320 }}>
        <div className="text-3xl">📄</div>
        <p className="text-sm font-semibold text-slate-700">Belum ada file untuk dipratinjau</p>
        <p className="text-xs text-slate-400">Upload file di Step 1 terlebih dahulu.</p>
      </div>
    );
  }

  const isPdf = file.type === 'application/pdf';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      style={{ minHeight: 320 }}>
      <div className="px-4 py-2 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 truncate">{file.name}</p>
        <p className="text-[11px] text-slate-400">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
      <div className="w-full h-[520px] bg-white">
        {isPdf ? (
          <iframe
            src={previewUrl}
            title="Preview sertifikat PDF"
            className="w-full h-full"
          />
        ) : (
          <img
            src={previewUrl}
            alt="Preview sertifikat upload"
            className="w-full h-full object-contain bg-white"
          />
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function IssuePage() {
  const router = useRouter();
  const { address, isConnected, isInitializing } = useWallet();
  const { uploadFile, uploadMetadata, isUploading } = useIPFS();
  const { mintCertificate, batchMint, isMinting } = useContract();

  const [step, setStep] = useState(1);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchFileName, setBatchFileName] = useState('');
  const [batchCount, setBatchCount] = useState(0);
  const [batchParticipants, setBatchParticipants] = useState<any[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const [mintResults, setMintResults] = useState<any[]>([]);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, processingName: '' });
  const [batchStatus, setBatchStatus] = useState<'idle' | 'processing' | 'done'>('idle');

  const [isBusy, setIsBusy] = useState(false);

  const [form, setForm] = useState<FormData>({
    recipientName: '',
    role: 'Peserta',
    recipientWalletAddress: '',
    recipientEmail: '',
    eventName: '',
    issueDate: '',
    organizerName: '',
    eventTheme: '',
    certificateNumberMode: 'auto',
    customCertificateNumber: '',
  });

  useEffect(() => {
    if (!isInitializing && isConnected === false) router.push('/connect');
  }, [isConnected, isInitializing, router]);

  const updateForm = (field: keyof FormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const templateTypeLabel = templateFile
    ? templateFile.type === 'application/pdf'
      ? 'PDF Document'
      : templateFile.type === 'image/png'
        ? 'PNG Image'
        : templateFile.type === 'image/jpeg'
          ? 'JPEG/JPG Image'
          : 'Dokumen'
    : '—';

  const step1Ok = !!templateFile;
  const isBatchWithParticipants = batchMode && batchParticipants.length > 0;
  const step2Ok =
    (isBatchWithParticipants || (!!form.recipientName && !!form.role)) &&
    !!form.eventName &&
    !!form.issueDate &&
    !!form.organizerName &&
    (form.certificateNumberMode === 'auto' || !!form.customCertificateNumber.trim());

  const resolvedCertificateNumber = form.certificateNumberMode === 'custom'
    ? form.customCertificateNumber.trim()
    : generateCertificateNumber(form.issueDate, 1);
  const networkLabel = CHAIN_ID === 137 ? 'Mainnet' : CHAIN_ID === 80002 ? 'Amoy Testnet' : `Chain ID ${CHAIN_ID}`;
  // ── Sequential minting (single certificate atau retry failed) ──────────────
  const processSequentialMinting = async (indices: number[], pdfCID: string, targets: any[]) => {
    let currentResults = [...mintResults];
    if (currentResults.length === 0) {
      currentResults = targets.map((p, i) => ({
        id: i + 1,
        recipientName: p.recipientName,
        role: p.role,
        status: 'pending',
      }));
    }

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const p = targets[idx];
      setBatchProgress({ current: i, total: indices.length, processingName: p.recipientName });

      const certNum =
        form.certificateNumberMode === 'custom'
          ? (batchMode && p.certificateNumber ? p.certificateNumber : form.customCertificateNumber.trim())
          : generateCertificateNumber(form.issueDate, idx + 1);

      try {
        const rawAddr = (p.walletAddress || '').trim();
        const isValidAddr = /^0x[a-fA-F0-9]{40}$/.test(rawAddr) && rawAddr !== '0x0000000000000000000000000000000000000000';
        const mintRecipient = isValidAddr ? rawAddr : (address || '');

        const meta = buildNFTMetadata({
          recipientName: p.recipientName,
          role: p.role,
          eventTitle: form.eventName,
          eventTheme: form.eventTheme,
          issueDate: form.issueDate,
          organizerName: form.organizerName,
          pdfCID,
          issuerAddress: address || 'Unknown',
          recipientWalletAddress: mintRecipient,
          certificateNumber: certNum,
          sequenceNumber: idx + 1,
          tokenId: '0',
          appUrl: APP_URL,
        });

        const metaCid = await uploadMetadata(meta);

        const signatureData: CertificateSignatureData = {
          recipientName: p.recipientName,
          eventTitle: form.eventName,
          issueDate: form.issueDate,
          role: p.role,
          recipientWalletAddress: mintRecipient.toLowerCase(),
          certificateNumber: certNum,
        };

        const r = await mintCertificate(mintRecipient, `ipfs://${metaCid}`, signatureData);

        const verifyUrl = `${APP_URL}/verify/${r.tokenId}`;
        let qrDataUrl = '';
        try {
          qrDataUrl = await QRCode.toDataURL(verifyUrl, {
            width: 512,
            margin: 1,
            color: { dark: '#111827', light: '#FFFFFF' },
          });
        } catch {}

        currentResults[idx] = {
          id: idx + 1,
          recipientName: p.recipientName,
          role: p.role,
          tokenId: r.tokenId,
          txHash: r.transactionHash,
          ipfsCid: r.metadataCID,
          qrUrl: qrDataUrl,
          verifyUrl,
          status: 'success',
        };
      } catch (e: any) {
        console.error(`❌ Minting gagal untuk ${p.recipientName}:`, e);
        console.error('Error code:', e.code);
        console.error('Error reason:', e.reason);
        console.error('Error data:', e.data);
        console.error('Error message:', e.message);
        currentResults[idx] = {
          id: idx + 1,
          recipientName: p.recipientName,
          role: p.role,
          status: 'failed',
          errorMsg: e.reason || e.message || 'Error',
        };
      }

      setMintResults([...currentResults]);
      setBatchProgress({ current: i + 1, total: indices.length, processingName: p.recipientName });

      if (i < indices.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  };

  // ── Helper: retry wrapper untuk upload IPFS ────────────────────────────────
  async function uploadWithRetry(uploadFn: () => Promise<string>, maxRetries = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await uploadFn();
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await new Promise(res => setTimeout(res, 1000 * attempt));
      }
    }
    throw new Error("Upload gagal setelah 3 percobaan");
  }

  // ── Batch minting (semua peserta dalam 1 transaksi blockchain) ─────────────
  const processBatchMinting = async (pdfCID: string, targets: any[]) => {
    let currentResults: any[] = targets.map((p, i) => ({
      id: i + 1,
      recipientName: p.recipientName,
      role: p.role,
      status: 'pending',
    }));
    setMintResults([...currentResults]);

    // ── Fase 1: Upload semua metadata ke IPFS ─────────────────────────────
    const participants: import('@/types').Participant[] = [];
    const tokenURIs: string[] = [];
    const signatureDataList: CertificateSignatureData[] = [];

    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      setBatchProgress({ current: i, total: targets.length, processingName: `Persiapan metadata: ${p.recipientName}` });

      const certNum =
        form.certificateNumberMode === 'custom' && p.certificateNumber
          ? p.certificateNumber
          : generateCertificateNumber(form.issueDate, i + 1);
      const rawAddr = (p.walletAddress || '').trim();
      const isValidAddr = /^0x[a-fA-F0-9]{40}$/.test(rawAddr) && rawAddr !== '0x0000000000000000000000000000000000000000';
      const mintRecipient = isValidAddr ? rawAddr : (address || '');

      try {
        const meta = buildNFTMetadata({
          recipientName: p.recipientName,
          role: p.role,
          eventTitle: form.eventName,
          eventTheme: form.eventTheme,
          issueDate: form.issueDate,
          organizerName: form.organizerName,
          pdfCID,
          issuerAddress: address || 'Unknown',
          recipientWalletAddress: mintRecipient,
          certificateNumber: certNum,
          sequenceNumber: i + 1,
          tokenId: '0',
          appUrl: APP_URL,
        });

        const metaCid = await uploadWithRetry(() => uploadMetadata(meta));
        tokenURIs.push(`ipfs://${metaCid}`);

        participants.push({
          recipientName: p.recipientName,
          role: p.role,
          sequenceNumber: i + 1,
          walletAddress: mintRecipient,
          email: p.email,
        });

        signatureDataList.push({
          recipientName: p.recipientName,
          eventTitle: form.eventName,
          issueDate: form.issueDate,
          role: p.role,
          recipientWalletAddress: mintRecipient.toLowerCase(),
          certificateNumber: certNum,
        });

        currentResults[i] = { ...currentResults[i], status: 'pending' };
      } catch (e: any) {
        // Jika upload metadata gagal, batalkan seluruh batch
        throw new Error(`Gagal upload metadata untuk ${p.recipientName}: ${e.message}`);
      }
    }

    // ── Fase 2: Batch mint (signing + 1 transaksi blockchain) ────────────
    setBatchProgress({ current: 0, total: targets.length, processingName: 'Menandatangani & minting batch...' });

    const results = await batchMint(participants, tokenURIs, signatureDataList);

    // ── Fase 3: Post-processing (generate QR codes) ─────────────────────
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const verifyUrl = `${APP_URL}/verify/${r.tokenId}`;
      let qrDataUrl = '';
      try {
        qrDataUrl = await QRCode.toDataURL(verifyUrl, {
          width: 512,
          margin: 1,
          color: { dark: '#111827', light: '#FFFFFF' },
        });
      } catch {}

      currentResults[i] = {
        id: i + 1,
        recipientName: participants[i].recipientName,
        role: participants[i].role,
        tokenId: r.tokenId,
        txHash: r.transactionHash,
        ipfsCid: r.metadataCID,
        qrUrl: qrDataUrl,
        verifyUrl,
        status: 'success',
      };

      setBatchProgress({ current: i + 1, total: results.length, processingName: participants[i].recipientName });
    }

    setMintResults([...currentResults]);
  };

  // ── Main processMinting dispatcher ────────────────────────────────────────
  const processMinting = async (indices: number[]) => {
    if (!templateFile) return;
    setIsBusy(true);
    setBatchStatus('processing');

    let pdfCID: string;
    try {
      pdfCID = await uploadFile(templateFile);
    } catch (e: any) {
      alert(e.reason || e.message || 'Gagal upload template sertifikat');
      setIsBusy(false);
      setBatchStatus('idle');
      return;
    }

    const targets =
      batchMode && batchParticipants.length > 0
        ? batchParticipants
        : [
            {
              recipientName: form.recipientName,
              role: form.role,
              walletAddress: form.recipientWalletAddress,
            },
          ];

    setBatchProgress({ current: 0, total: indices.length, processingName: '' });

    try {
      // Gunakan batch minting jika batch mode aktif dan ini bukan retry
      const isFullBatch = batchMode && batchParticipants.length > 0
        && indices.length === targets.length
        && indices.every((v, i) => v === i);

      if (isFullBatch) {
        // ── BATCH PATH: 1 transaksi blockchain untuk semua peserta ────────
        await processBatchMinting(pdfCID, targets);
      } else {
        // ── SEQUENTIAL PATH: untuk single certificate atau retry failed ───
        await processSequentialMinting(indices, pdfCID, targets);
      }
    } catch (e: any) {
      alert(e.reason || e.message || 'Gagal minting sertifikat');
    }

    setBatchStatus('done');
    setIsBusy(false);
    setStep(4);
  };

  const handleMint = () => {
    setMintResults([]);
    const targets = batchMode && batchParticipants.length > 0 ? batchParticipants : [form];
    processMinting(targets.map((_, i) => i));
  };

  const handleRetryFailed = () => {
    const failedIndices = mintResults.map((r, i) => r.status === 'failed' ? i : -1).filter(i => i !== -1);
    if (failedIndices.length > 0) {
      processMinting(failedIndices);
    }
  };

  const handleDownloadAllQr = async () => {
    if (mintResults.length === 0) return;
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      mintResults.forEach((res) => {
        if (res.status === 'success' && res.qrUrl) {
          const base64Data = res.qrUrl.replace(/^data:image\/(png|jpg);base64,/, "");
          zip.file(`QR_${res.tokenId}_${res.recipientName.replace(/[^a-zA-Z0-9]/g, '_')}.png`, base64Data, { base64: true });
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `QR_Sertifikat_${form.eventName.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Gagal mendownload ZIP", err);
      alert("Terjadi kesalahan saat memproses file ZIP.");
    }
  };


  if (isInitializing || !isConnected) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 p-6 pb-28 max-w-5xl w-full mx-auto space-y-6">

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Terbitkan Sertifikat Baru</h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload sertifikat dan terbitkan sebagai NFT di blockchain Polygon
          </p>
        </div>

        <StepIndicator current={step} />

        {/* ── Step 1: Upload File ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Drop zone card */}
            <div className="rounded-2xl p-6 bg-white shadow-sm border border-gray-100">
              <DropZone file={templateFile} onFile={setTemplateFile} />
            </div>

            {/* Upload Massal (Batch) */}
            <div className="rounded-2xl p-5 bg-white shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Upload Massal (Batch)</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upload banyak sertifikat sekaligus menggunakan CSV
                  </p>
                </div>
                {/* Toggle Switch */}
                <button
                  onClick={() => setBatchMode((v) => !v)}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                  style={{ background: batchMode ? '#6366F1' : '#E5E7EB' }}
                  role="switch"
                  aria-checked={batchMode}
                >
                  <span
                    className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200"
                    style={{ transform: batchMode ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>

              {batchMode && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={downloadCSVTemplate}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-slate-600 hover:bg-gray-50 transition-all"
                    >
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Unduh Template CSV
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-slate-600 hover:bg-gray-50 transition-all cursor-pointer">
                      Upload CSV Peserta
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const participants = await parseParticipantsCSV(file);
                            setBatchParticipants(participants);
                            setBatchFileName(file.name);
                            setBatchCount(participants.length);
                          } catch (err: any) {
                            alert(err?.message || 'CSV tidak valid');
                          }
                        }}
                      />
                    </label>
                  </div>
                  {(batchFileName || batchCount > 0) && (
                    <p className="text-xs text-slate-500 mt-2">
                      File: <span className="font-medium">{batchFileName}</span> ({batchCount} peserta)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Isi Data ─────────────────────────────────────────── */}
        {step === 2 && (
          <IssueForm form={form} updateForm={updateForm} batchMode={isBatchWithParticipants} batchCount={batchCount} />
        )}

        {/* ── Step 3: Preview ───────────────────────────────────────────── */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: Certificate Preview */}
            <div className="col-span-1 lg:col-span-3 rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="text-sm font-semibold text-slate-700">Pratinjau Sertifikat</span>
                </div>
                <button className="text-xs text-slate-400 flex items-center gap-1 hover:text-indigo-500 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Perbesar
                </button>
              </div>
              <div className="p-5">
                <CertificatePreview file={templateFile} />
              </div>
            </div>

            {/* Right: Info panels */}
            <div className="col-span-1 lg:col-span-2 space-y-4">
              {/* Ringkasan Informasi */}
              <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-semibold text-slate-700">
                    {isBatchWithParticipants ? 'Ringkasan Batch' : 'Ringkasan Informasi'}
                  </p>
                </div>
                {isBatchWithParticipants ? (
                  <div className="space-y-4">
                    <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-center">
                      <p className="text-sm font-bold text-indigo-800">
                        {batchParticipants.length} sertifikat akan diterbitkan
                      </p>
                    </div>

                    <div className="space-y-2 border-b border-gray-100 pb-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NAMA EVENT / KEGIATAN</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{form.eventName || '—'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TANGGAL TERBIT</p>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5">{form.issueDate || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PENYELENGGARA</p>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5">{form.organizerName || '—'}</p>
                        </div>
                      </div>
                      {!!form.eventTheme.trim() && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TEMA EVENT</p>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5">{form.eventTheme}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Daftar Peserta</p>
                      <div className="overflow-y-auto max-h-60 rounded-xl border border-gray-100 shadow-inner">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-gray-100 shadow-sm">
                            <tr>
                              <th className="px-3 py-2 text-center w-10">No</th>
                              <th className="px-3 py-2">Nama Penerima</th>
                              <th className="px-3 py-2 w-16">Peran</th>
                              <th className="px-3 py-2">No. Sertifikat</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-slate-700 bg-white">
                            {batchParticipants.map((p, idx) => {
                              const resolvedCertNum = form.certificateNumberMode === 'custom' && p.certificateNumber
                                ? p.certificateNumber
                                : generateCertificateNumber(form.issueDate, idx + 1);
                              return (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 text-center text-slate-400">{idx + 1}</td>
                                  <td className="px-3 py-2 font-medium text-slate-800 truncate max-w-[120px]" title={p.recipientName}>
                                    {p.recipientName}
                                  </td>
                                  <td className="px-3 py-2">{p.role}</td>
                                  <td className="px-3 py-2 font-mono text-[10px] text-slate-500 truncate max-w-[100px]" title={resolvedCertNum}>
                                    {resolvedCertNum}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      ['NAMA PENERIMA', form.recipientName || '—'],
                      ['NAMA EVENT / KEGIATAN', form.eventName || '—'],
                      ['PERAN', form.role || '—'],
                      ['NOMOR SERTIFIKAT', resolvedCertificateNumber || '—'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs text-slate-400 tracking-wider">{label}</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-400 tracking-wider">TANGGAL TERBIT</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{form.issueDate || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 tracking-wider">PENYELENGGARA</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{form.organizerName || '—'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 tracking-wider">TIPE FILE</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{templateTypeLabel}</p>
                    </div>
                    {!!form.eventTheme.trim() && (
                      <div>
                        <p className="text-xs text-slate-400 tracking-wider">TEMA EVENT</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{form.eventTheme}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Informasi Blockchain */}
              <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <p className="text-sm font-semibold text-slate-700">Informasi Blockchain</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Jaringan</span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-sm bg-purple-700 inline-block" />
                      Polygon POS
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Estimasi Biaya Gas</span>
                    <span className="text-xs font-bold text-slate-800">
                      {isBatchWithParticipants
                        ? `~ ${(0.004 * batchParticipants.length).toFixed(4)} MATIC`
                        : '~ 0.0045 MATIC'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Status Wallet</span>
                    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#059669' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Saldo Mencukupi
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirmation checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500 leading-relaxed">
                  Saya mengonfirmasi bahwa data di atas sudah benar dan setuju untuk menerbitkan
                  sertifikat ini ke blockchain secara permanen.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* ── Step 4: Terbitkan / Success ───────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            {/* Success Banner */}
            <div className="rounded-2xl p-8 bg-white shadow-sm border border-gray-100 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)' }}>
                <svg className="w-8 h-8" fill="none" stroke="#10B981" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Proses Minting Selesai!</h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  Berhasil mencetak {mintResults.filter(r => r.status === 'success').length} dari {mintResults.length} sertifikat di jaringan Polygon ({networkLabel}).
                </p>
              </div>
            </div>

            {/* Table Detail Hasil Minting */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-semibold text-slate-800 text-sm">Detail Hasil Minting</h3>
                <div className="flex gap-2">
                  {mintResults.some(r => r.status === 'failed') && (
                    <button
                      onClick={handleRetryFailed}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all border border-red-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry Gagal
                    </button>
                  )}
                  <button
                    onClick={handleDownloadAllQr}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all border border-indigo-100"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Unduh Semua QR (ZIP)
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-400 text-[11px] uppercase font-semibold tracking-wider sticky top-0 border-b border-gray-100 shadow-sm">
                    <tr>
                      <th className="px-5 py-3">No</th>
                      <th className="px-5 py-3">Nama</th>
                      <th className="px-5 py-3">Peran</th>
                      <th className="px-5 py-3">Token ID</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Tx Hash</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mintResults.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-slate-500 text-xs">{r.id}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{r.recipientName}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{r.role}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-600">
                          {r.tokenId ? `#${r.tokenId}` : '-'}
                        </td>
                        <td className="px-5 py-3">
                          {r.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Berhasil
                            </span>
                          ) : r.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-700 text-[11px] font-semibold border border-red-100 cursor-help" title={r.errorMsg}>
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              Gagal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-500 text-[11px] font-semibold border border-gray-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                              Menunggu
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-mono text-[11px] text-indigo-500 hover:text-indigo-700 transition-colors">
                          {r.txHash ? (
                            <a href={`${process.env.NEXT_PUBLIC_POLYGONSCAN_URL || 'https://amoy.polygonscan.com'}/tx/${r.txHash}`} target="_blank" rel="noreferrer" className="hover:underline">
                              {r.txHash.slice(0, 10)}...{r.txHash.slice(-4)}
                            </a>
                          ) : '-'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {r.status === 'success' && r.qrUrl && (
                            <a href={r.qrUrl} download={`qr_${r.tokenId}.png`} className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold border border-indigo-100 px-2 py-1 rounded-md bg-white hover:bg-indigo-50 transition-colors inline-block">
                              Unduh QR
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Minting Progress Overlay */}
        {isBusy && batchStatus === 'processing' && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="relative w-20 h-20 mx-auto">
                <svg className="animate-spin w-full h-full text-indigo-100" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="#4F46E5" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-indigo-600">
                  {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Memproses Sertifikat</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Selesai {batchProgress.current} dari {batchProgress.total} peserta
                </p>
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                  ⚠️ MetaMask akan meminta tanda tangan digital untuk setiap sertifikat.
                  Ini bukan transaksi — tidak ada biaya gas tambahan.
                </p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs font-semibold text-slate-600 bg-slate-50 py-2 px-3 rounded-lg border border-slate-100 truncate shadow-sm">
                <span className="text-slate-400 font-normal">Memproses:</span> {batchProgress.processingName || '...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Navigation Bar ──────────────────────────────────────── */}
      <div className="fixed bottom-0 right-0 left-0 md:left-44 bg-white border-t border-gray-100 px-4 py-3.5 md:px-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 z-30 shadow-sm">

        {/* Step 1 */}
        {step === 1 && (
          <>
            <div className="hidden sm:block flex-1" />
            <button
              onClick={() => setStep(2)}
              disabled={!step1Ok}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all text-center"
              style={
                step1Ok
                  ? { background: 'linear-gradient(135deg,#4F46E5,#6366F1,#3B82F6)', boxShadow: '0 4px 14px rgba(99,102,241,.35)' }
                  : { background: '#E2E8F0', color: '#94A3B8', cursor: 'not-allowed' }
              }
            >
              Lanjut ke Data Sertifikat →
            </button>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <button
              onClick={() => setStep(1)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 border border-gray-200 hover:bg-gray-50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali
            </button>
            <div className="hidden sm:block flex-1" />
            <button
              onClick={() => setStep(3)}
              disabled={!step2Ok}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all text-center"
              style={
                step2Ok
                  ? { background: 'linear-gradient(135deg,#4F46E5,#6366F1,#3B82F6)', boxShadow: '0 4px 14px rgba(99,102,241,.35)' }
                  : { background: '#E2E8F0', color: '#94A3B8', cursor: 'not-allowed' }
              }
            >
              Lanjut Preview →
            </button>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setStep(2)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 border border-gray-200 hover:bg-gray-50 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Kembali
              </button>
              <button
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-slate-600 hover:bg-gray-50 transition-all"
              >
                Simpan Draft
              </button>
            </div>
            <div className="hidden sm:block flex-1" />
            <button
              onClick={handleMint}
              disabled={!confirmed || isBusy}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={
                confirmed && !isBusy
                  ? { background: 'linear-gradient(135deg,#4F46E5,#6366F1,#3B82F6)', boxShadow: '0 4px 14px rgba(99,102,241,.35)' }
                  : { background: '#E2E8F0', color: '#94A3B8', cursor: 'not-allowed' }
              }
            >
              {isBusy && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Terbitkan Sertifikat ke Blockchain →
            </button>
          </>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <>
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-slate-600 hover:bg-gray-50 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Unduh Sertifikat (PDF)
            </button>
            <div className="hidden sm:block flex-1" />
            <div className="flex gap-2 w-full sm:w-auto">
              <Link
                href="/dashboard/certificates"
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-slate-600 hover:bg-gray-50 transition-all text-center"
              >
                Lihat Riwayat
              </Link>
              <Link
                href="/dashboard"
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-sm font-semibold text-white text-center"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#6366F1,#3B82F6)', boxShadow: '0 4px 14px rgba(99,102,241,.35)' }}
              >
                Selesai
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}