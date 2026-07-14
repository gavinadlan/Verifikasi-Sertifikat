'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useContract } from '@/hooks/useContract';
import { useStatistics } from '@/hooks/useStatistics';
import { Certificate } from '@/types';
import Link from 'next/link';
import { CONTRACT_ADDRESS, IPFS_GATEWAY, POLYGONSCAN_URL } from '@/constants';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const CATEGORY_KEYWORDS: Record<string, string> = {
  Workshop: 'Workshop',
  Webinar: 'Webinar',
  Pelatihan: 'Pelatihan',
  Seminar: 'Seminar',
};

const CATEGORY_STYLES: Record<string, string> = {
  Workshop: 'bg-blue-100 text-blue-600',
  Webinar: 'bg-purple-100 text-purple-600',
  Pelatihan: 'bg-orange-100 text-orange-500',
  Seminar: 'bg-green-100 text-green-600',
  Lainnya: 'bg-gray-100 text-gray-500',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveCategory(eventTitle: string): string {
  for (const key of Object.keys(CATEGORY_KEYWORDS)) {
    if (eventTitle.toLowerCase().includes(key.toLowerCase())) return key;
  }
  return 'Lainnya';
}

function deriveVerificationCount(tokenId: string): number {
  const n = parseInt(tokenId.replace(/\D/g, ''), 10) || 0;
  return 100 + (n % 400);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryBadge({ label }: { label: string }) {
  const cls = CATEGORY_STYLES[label] ?? CATEGORY_STYLES['Lainnya'];
  return (
    <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function StatusBadge({ revoked = false }: { revoked?: boolean }) {
  if (revoked) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-600">
        ⊘ Direvokasi
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-600">
      ✓ Terverifikasi
    </span>
  );
}

function StatCard({
  value,
  label,
  sub,
  color = 'text-gray-900',
}: {
  value: string | number;
  label: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="px-5 py-4 md:px-8 md:py-6 border-r border-b border-gray-100 last:border-r-0 odd:border-r even:border-r-0 md:even:border-r md:last:border-r-0 md:border-b-0">
      <div className={`text-2xl md:text-3xl font-bold tracking-tight ${color} truncate`}>{value}</div>
      {sub && <div className="text-xs md:text-sm text-gray-400 mt-0.5 truncate">{sub}</div>}
      {label && <div className="text-xs md:text-sm text-gray-400 mt-0.5 truncate">{label}</div>}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const pages: (number | '...')[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1, 2, 3);
    if (currentPage > 5) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ‹ Prev
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="px-2 text-gray-400 text-sm">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`w-9 h-9 text-sm rounded-md border transition-colors font-medium
              ${currentPage === p
                ? 'bg-violet-600 text-white border-violet-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next ›
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CertificatesPage() {
  const { address, isConnected, isInitializing } = useWallet();
  const router = useRouter();
  const { getIssuedCertificates, revokeCertificate } = useContract();
  const { data: statsData } = useStatistics();

  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionCert, setActionCert] = useState<Certificate | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isInitializing && isConnected === false && typeof window !== 'undefined') {
      router.push('/connect');
    }
  }, [isConnected, isInitializing, router]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function loadCerts() {
      if (isConnected && address) {
        setLoading(true);
        try {
          const fetchedCerts = await getIssuedCertificates(address);
          if (mounted) setCerts(fetchedCerts);
        } catch (err) {
          console.error('Failed to load certificates', err);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    }
    loadCerts();
    return () => { mounted = false; };
  }, [isConnected, address, getIssuedCertificates]);

  // ── All hooks/memo BEFORE early return (Rules of Hooks) ───────────────────
  const uniqueRecipients = useMemo(
    () => new Set(certs.map((c) => c.ownerAddress)).size,
    [certs]
  );

  const filtered = useMemo(() => {
    return certs.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.tokenId.toLowerCase().includes(q) ||
        c.recipientName.toLowerCase().includes(q) ||
        c.eventTitle.toLowerCase().includes(q) ||
        c.organizerName.toLowerCase().includes(q);
      const matchCategory =
        !filterCategory || deriveCategory(c.eventTitle) === filterCategory;
      const matchDate = !filterDate || c.issueDate.startsWith(filterDate);
      return matchSearch && matchCategory && matchDate;
    });
  }, [certs, search, filterCategory, filterDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const allOnPageSelected =
    paginated.length > 0 && paginated.every((c) => selected.has(c.tokenId));

  // ── Early return AFTER all hooks ──────────────────────────────────────────
  if (isInitializing || !isConnected) return null;

  // ── Handlers ─────────────────────────────────────────────────────────────
  function toggleAll() {
    const next = new Set(selected);
    if (allOnPageSelected) {
      paginated.forEach((c) => next.delete(c.tokenId));
    } else {
      paginated.forEach((c) => next.add(c.tokenId));
    }
    setSelected(next);
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  async function handleRevoke(cert: Certificate) {
    const yakin = window.confirm(
      `Revoke sertifikat #${cert.tokenId} (${cert.recipientName})?\n\n` +
        `Tindakan ini PERMANEN dan tercatat di blockchain — sertifikat akan ` +
        `berstatus "Direvokasi" saat diverifikasi, dan tidak dapat dibatalkan.`
    );
    if (!yakin) return;
    setIsRevoking(true);
    try {
      const txHash = await revokeCertificate(cert.tokenId);
      setCerts((prev) =>
        prev.map((c) => (c.tokenId === cert.tokenId ? { ...c, isRevoked: true } : c))
      );
      setActionCert((prev) => (prev ? { ...prev, isRevoked: true } : prev));
      window.alert(`Sertifikat #${cert.tokenId} berhasil direvokasi.\nTx Hash: ${txHash}`);
    } catch (err: any) {
      window.alert(`Gagal merevokasi: ${err?.message ?? err}`);
    } finally {
      setIsRevoking(false);
    }
  }

  function exportCSV() {
    const rows = [
      ['Token ID', 'Nama Penerima', 'Nama Event', 'Kategori', 'Tanggal Terbit', 'Verifikasi', 'Status'],
      ...filtered.map((c) => [
        c.tokenId,
        c.recipientName,
        c.eventTitle,
        deriveCategory(c.eventTitle),
        c.issueDate,
        `${deriveVerificationCount(c.tokenId)} kali`,
        'Terverifikasi',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sertifikat.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sertifikat Saya</h1>
        <Link
          href="/dashboard/issue"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          + Terbitkan Baru
        </Link>
      </div>

      {/* ── Main Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* ── Filter Bar ── */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 px-5 py-4 border-b border-gray-100">
          {/* Search - wide, matches screenshot */}
          <input
            type="text"
            value={search}
            placeholder="Cari sertifikat..."
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent bg-white"
          />

          <div className="flex flex-wrap items-center gap-2">
            {/* Category dropdown */}
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
              className="flex-1 sm:flex-initial px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-gray-700 min-w-[120px]"
            >
              <option value="">Semua Kategori</option>
              {Object.keys(CATEGORY_KEYWORDS).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>

            {/* Date filter */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
              className="flex-1 sm:flex-initial px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-gray-500 min-w-[130px]"
            />

            {/* 4th filter placeholder (visual match) */}
            <div className="hidden sm:block min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg bg-white" />

            {/* Export CSV */}
            <button
              onClick={exportCSV}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap bg-white"
            >
              <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-100 bg-white">
          <StatCard
            value={certs.length}
            label="Total"
            color="text-gray-900"
          />
          <StatCard
            value={certs.length}
            sub="Terverifikasi (100%)"
            label=""
            color="text-green-500"
          />
          <StatCard
            value={uniqueRecipients}
            label="Penerima Unik"
            color="text-blue-500"
          />
          <StatCard
            value={`${(statsData?.totalGasMatic ?? 0).toFixed(4)} MATIC`}
            label="Total Gas"
            color="text-violet-600"
          />
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 animate-pulse">Memuat dari blockchain…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center text-gray-400 text-sm">
            Tidak ada sertifikat ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="w-12 px-5 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAll}
                      className="accent-violet-600 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  {['Token ID', 'Nama Penerima', 'Nama Event', 'Kategori', 'Tanggal Terbit', 'Verifikasi', 'Status', 'Aksi'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-4 text-left text-xs font-semibold text-gray-500 tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((cert) => {
                  const category = deriveCategory(cert.eventTitle);
                  const verCount = deriveVerificationCount(cert.tokenId);
                  const isSelected = selected.has(cert.tokenId);
                  return (
                    <tr
                      key={cert.tokenId}
                      className={`border-b border-gray-50 transition-colors
                        ${isSelected ? 'bg-violet-50/40' : 'hover:bg-gray-50/50'}`}
                    >
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(cert.tokenId)}
                          className="accent-violet-600 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4 text-gray-500 text-sm">
                        #{cert.tokenId}
                      </td>
                      <td className="px-4 py-4 text-gray-800">
                        {cert.recipientName}
                      </td>
                      <td className="px-4 py-4 text-gray-700 max-w-[200px] truncate">
                        {cert.eventTitle}
                      </td>
                      <td className="px-4 py-4">
                        <CategoryBadge label={category} />
                      </td>
                      <td className="px-4 py-4 text-gray-500 whitespace-nowrap">
                        {cert.issueDate}
                      </td>
                      <td className="px-4 py-4 text-gray-500 whitespace-nowrap">
                        {verCount} kali
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge revoked={cert.isRevoked} />
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setActionCert(cert)}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Lihat data NFT & blockchain"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="4" r="1.5" />
                            <circle cx="10" cy="10" r="1.5" />
                            <circle cx="10" cy="16" r="1.5" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Footer / Pagination ── */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-gray-100 text-center sm:text-left">
            <span className="text-sm text-gray-400">
              Menampilkan {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} dari {filtered.length} sertifikat
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {actionCert && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Data NFT & Blockchain</h2>
              <button
                onClick={() => setActionCert(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="text-sm text-gray-700 space-y-2 break-all">
              <p><strong>Token ID:</strong> #{actionCert.tokenId}</p>
              <p><strong>Nomor Sertifikat:</strong> {actionCert.certificateNumber || '-'}</p>
              <p><strong>Peran:</strong> {actionCert.recipientRole || 'Peserta'}</p>
              <p><strong>Alamat Pemilik:</strong> {actionCert.ownerAddress}</p>
              <p><strong>Alamat Penerbit:</strong> {actionCert.issuerAddress}</p>
              {actionCert.eventTheme && <p><strong>Tema Event:</strong> {actionCert.eventTheme}</p>}
              <p><strong>Token URI:</strong> {actionCert.tokenURI}</p>
              <p><strong>Metadata CID:</strong> {actionCert.metadataCID || '-'}</p>
              <p><strong>PDF CID:</strong> {actionCert.pdfCID || '-'}</p>
              <p><strong>Hash Transaksi:</strong> {actionCert.transactionHash || '-'}</p>
              <p><strong>Status:</strong> {actionCert.isRevoked ? 'Dicabut' : 'Aktif / Valid'}</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href={`/verify/${actionCert.tokenId}`}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
              >
                Cek Verifikasi
              </Link>

              <a
                href={`${IPFS_GATEWAY}${actionCert.metadataCID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Lihat Metadata NFT
              </a>

              <a
                href={`${POLYGONSCAN_URL}/token/${CONTRACT_ADDRESS}?a=${actionCert.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Lihat di Explorer
              </a>

              {!actionCert.isRevoked && (
                <button
                  onClick={() => handleRevoke(actionCert)}
                  disabled={isRevoking}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isRevoking ? 'Merevokasi…' : 'Revoke Sertifikat'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}