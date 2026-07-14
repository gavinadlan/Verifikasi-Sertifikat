'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useStatistics, CategoryCount, DailyCount, RecentActivity } from '@/hooks/useStatistics';
import { POLYGONSCAN_URL } from '@/constants';

// ── Types ─────────────────────────────────────────────────────────
type TimeRange = '7D' | '30D' | '90D' | '6M' | '1Y' | 'All';

// ── Palette for category donut ────────────────────────────────────
const PALETTE = [
  '#6366F1', '#06B6D4', '#3B82F6', '#10B981',
  '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
];

// ── Helpers ───────────────────────────────────────────────────────
function shortDate(dateStr: string): string {
  // YYYY-MM-DD → "15 Jan"
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function filterDailyMints(mints: DailyCount[], range: TimeRange): DailyCount[] {
  const dayMap: Record<TimeRange, number> = {
    '7D': 7, '30D': 30, '90D': 90, '6M': 180, '1Y': 365, 'All': 9999,
  };
  const days = dayMap[range];
  return mints.slice(-Math.min(days, mints.length));
}

// ── SVG Line Chart ─────────────────────────────────────────────────
function LineChart({ data }: { data: DailyCount[] }) {
  if (!data.length) return null;

  const W = 860, H = 200;
  const PAD = { top: 20, right: 20, bottom: 30, left: 30 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.count), 1);

  const xOf = (i: number) =>
    PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yOf = (v: number) => PAD.top + innerH - (v / maxVal) * innerH;

  const pts = data.map((d, i) => `${xOf(i)},${yOf(d.count)}`).join(' ');
  const area = `M ${xOf(0)},${yOf(data[0].count)} L ${pts} L ${xOf(data.length - 1)},${H - PAD.bottom} L ${xOf(0)},${H - PAD.bottom} Z`;

  // Y grid
  const gridVals = Array.from(
    { length: 5 },
    (_, i) => Math.round((maxVal / 4) * i)
  );

  // X labels: show ~6 evenly spaced
  const step = Math.max(1, Math.floor(data.length / 6));
  const xLabels = data
    .map((d, i) => ({ i, label: shortDate(d.date) }))
    .filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
      <defs>
        <linearGradient id="gradMint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#818CF8" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {gridVals.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={yOf(v)} y2={yOf(v)}
            stroke="#F3F4F6" strokeWidth={1} />
          <text x={PAD.left - 6} y={yOf(v) + 4} textAnchor="end" fontSize={10} fill="#D1D5DB">
            {v}
          </text>
        </g>
      ))}

      {xLabels.map(({ i, label }) => (
        <text key={i} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize={10} fill="#9CA3AF">
          {label}
        </text>
      ))}

      <path d={area} fill="url(#gradMint)" />
      <polyline points={pts} fill="none" stroke="#818CF8" strokeWidth={2.5}
        strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots on data points (only if ≤ 30 points) */}
      {data.length <= 30 && data.map((d, i) => (
        d.count > 0 ? (
          <circle key={i} cx={xOf(i)} cy={yOf(d.count)} r={3}
            fill="#6366F1" stroke="white" strokeWidth={1.5} />
        ) : null
      ))}
    </svg>
  );
}

// ── SVG Donut Chart ────────────────────────────────────────────────
function DonutChart({ data }: { data: CategoryCount[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return (
    <div className="w-44 h-44 rounded-full border-[28px] border-gray-100 flex items-center justify-center">
      <span className="text-xs text-slate-400">Belum ada data</span>
    </div>
  );

  const R = 68, cx = 88, cy = 88, strokeW = 36;
  let cumulative = 0;

  const slices = data.map((d, idx) => {
    const pct = d.count / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const endAngle = (cumulative + pct) * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;

    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const largeArc = pct > 0.5 ? 1 : 0;

    return {
      ...d,
      color: PALETTE[idx % PALETTE.length],
      pathD: `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
      startAngle,
    };
  });

  return (
    <svg viewBox="0 0 176 176" style={{ width: 176, height: 176 }}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#F3F4F6" strokeWidth={strokeW} />
      {slices.map((s, i) => (
        <path key={i} d={s.pathD} fill="none" stroke={s.color}
          strokeWidth={strokeW} strokeLinecap="butt" />
      ))}
      {slices.map((s, i) => {
        const cumBefore = data.slice(0, i).reduce((acc, d) => acc + d.count / total, 0);
        const angle = cumBefore * 2 * Math.PI - Math.PI / 2;
        const inner = R - strokeW / 2 - 1, outer = R + strokeW / 2 + 1;
        return (
          <line key={`gap-${i}`}
            x1={cx + inner * Math.cos(angle)} y1={cy + inner * Math.sin(angle)}
            x2={cx + outer * Math.cos(angle)} y2={cy + outer * Math.sin(angle)}
            stroke="white" strokeWidth={2} />
        );
      })}
      {/* Center: total */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight="bold" fill="#1E293B">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#94A3B8">
        TOTAL
      </text>
    </svg>
  );
}

// ── SVG Bar Chart (last 7 days) ────────────────────────────────────
function BarChart({ data }: { data: DailyCount[] }) {
  const last7 = data.slice(-7);
  if (!last7.length) return null;

  const W = 340, H = 180;
  const PAD = { top: 16, right: 10, bottom: 28, left: 28 };
  const maxVal = Math.max(...last7.map((d) => d.count), 1);
  const barW = Math.floor((W - PAD.left - PAD.right) / last7.length) - 6;
  const gap = (W - PAD.left - PAD.right - last7.length * barW) / (last7.length - 1 || 1);

  const gridVals = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5),
    Math.round(maxVal * 0.75), maxVal];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      {gridVals.map((v) => {
        const y = PAD.top + (H - PAD.top - PAD.bottom) * (1 - v / maxVal);
        return (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
              stroke="#F3F4F6" strokeWidth={1} />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#D1D5DB">
              {v}
            </text>
          </g>
        );
      })}

      {last7.map((d, i) => {
        const barH = ((H - PAD.top - PAD.bottom) * d.count) / maxVal;
        const x = PAD.left + i * (barW + gap);
        const y = H - PAD.bottom - (barH || 0);

        return (
          <g key={i}>
            {d.count > 0 ? (
              <rect x={x} y={y} width={barW} height={barH} rx={5}
                fill="#6366F1" opacity={0.85} />
            ) : (
              <rect x={x} y={H - PAD.bottom - 2} width={barW} height={2} rx={1}
                fill="#E5E7EB" />
            )}
            <text x={x + barW / 2} y={H - PAD.bottom + 14} textAnchor="middle"
              fontSize={9} fill="#9CA3AF">
              {shortDate(d.date)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-100 rounded-xl ${className ?? ''}`} />
  );
}

// ── Error State ───────────────────────────────────────────────────
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl bg-white border border-red-100 shadow-sm p-8 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">Gagal memuat data blockchain</p>
        <p className="text-xs text-slate-400 mt-1">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-white mt-1"
        style={{ background: 'linear-gradient(135deg,#4F46E5,#6366F1)' }}
      >
        Coba Lagi
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function StatistikPage() {
  const router = useRouter();
  const { isConnected, isInitializing } = useWallet();
  const { data, isLoading, error, refresh } = useStatistics();

  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const TIME_RANGES: TimeRange[] = ['7D', '30D', '90D', '6M', '1Y', 'All'];

  const filteredDaily = useMemo(
    () => (data ? filterDailyMints(data.dailyMints, timeRange) : []),
    [data, timeRange]
  );

  // Redirect if not connected
  if (!isInitializing && !isConnected) {
    router.push('/connect');
    return null;
  }
  if (isInitializing || (!data && isLoading)) return null;

  const statCards = data
    ? [
      {
        value: data.totalMinted.toLocaleString('id-ID'),
        label: 'Total Diterbitkan',
        sub: 'Sertifikat on-chain',
        positive: true,
      },
      {
        value: data.totalVerified.toLocaleString('id-ID'),
        label: 'Diverifikasi',
        sub: 'Via halaman publik',
        positive: true,
      },
      {
        value: `${data.conversionRate}%`,
        label: 'Conversion Rate',
        sub: 'Verifikasi / Total',
        positive: data.conversionRate >= 0,
      },
      {
        value: data.avgVerifyTime !== null ? `${data.avgVerifyTime} jam` : '—',
        label: 'Avg Time to Verify',
        sub: 'Tidak tersedia on-chain',
        positive: true,
      },
    ]
    : [];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Statistik &amp; Analytics</h1>
            {data && (
              <p className="text-xs text-slate-400 mt-1">
                Diperbarui: {new Date(data.lastUpdated).toLocaleString('id-ID')} · Polygon Network
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Refresh */}
            <button
              onClick={refresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white text-slate-600 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isLoading ? 'Memuat...' : 'Refresh'}
            </button>

            {/* PolygonScan link */}
            <a
              href={POLYGONSCAN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-sm"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#6366F1,#3B82F6)', boxShadow: '0 4px 14px rgba(99,102,241,.3)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Lihat di PolygonScan
            </a>
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────── */}
        {error && <ErrorState message={error} onRetry={refresh} />}

        {/* ── Stat Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {isLoading && !data
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
            : statCards.map((card) => (
              <div key={card.label}
                className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-1">
                <p className="text-3xl font-bold text-slate-800">{card.value}</p>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-xs text-slate-400">{card.sub}</p>
              </div>
            ))}
        </div>

        {/* ── Line Chart ─────────────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-slate-800">Penerbitan Sertifikat</p>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                On-chain
              </span>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {TIME_RANGES.map((r) => (
                <button key={r} onClick={() => setTimeRange(r)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={
                    timeRange === r
                      ? { background: 'linear-gradient(135deg,#4F46E5,#6366F1)', color: 'white', boxShadow: '0 2px 8px rgba(99,102,241,.35)' }
                      : { color: '#6B7280', background: 'transparent' }
                  }>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {isLoading && !data ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              {filteredDaily.every((d) => d.count === 0) ? (
                <div className="h-48 flex items-center justify-center text-sm text-slate-400">
                  Belum ada sertifikat diterbitkan pada periode ini
                </div>
              ) : (
                <LineChart data={filteredDaily} />
              )}
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: '#818CF8' }} />
                  <span className="text-xs text-slate-500">Sertifikat Diterbitkan</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Donut + Bar ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Distribusi Kategori */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-base font-semibold text-slate-800">Distribusi Event</p>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                Dari metadata IPFS
              </span>
            </div>

            {isLoading && !data ? (
              <div className="flex gap-6">
                <Skeleton className="w-44 h-44 rounded-full" />
                <div className="flex-1 space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              </div>
            ) : !data?.categoryDistribution.length ? (
              <div className="h-44 flex items-center justify-center text-sm text-slate-400">
                Belum ada data kategori
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <DonutChart data={data.categoryDistribution} />
                <div className="grid grid-cols-1 gap-3 flex-1 overflow-hidden">
                  {data.categoryDistribution.map((d, i) => (
                    <div key={d.label} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className="text-xs text-slate-500 flex-1 truncate" title={d.label}>
                        {d.label}
                      </span>
                      <span className="text-sm font-bold text-slate-800">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Penerbitan Harian (last 7 days) */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-base font-semibold text-slate-800">Penerbitan Harian</p>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                7 hari terakhir
              </span>
            </div>

            {isLoading && !data ? (
              <Skeleton className="h-44 w-full" />
            ) : (
              <BarChart data={data?.dailyMints ?? []} />
            )}
          </div>
        </div>

        {/* ── Aktivitas Terbaru ───────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-base font-semibold text-slate-800">Aktivitas Terbaru</p>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
              CertificateMinted events
            </span>
          </div>

          {isLoading && !data ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data?.recentActivities.length ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Belum ada aktivitas yang tercatat
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Waktu', 'Aktivitas', 'Detail', 'Token ID', 'Tx Hash'].map((h) => (
                      <th key={h}
                        className="pb-3 text-left text-xs font-semibold text-slate-400 tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentActivities.map((a, i) => (
                    <tr key={i}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 text-sm text-slate-500 whitespace-nowrap">
                        {a.time}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                          <span className="text-sm font-semibold text-slate-700">
                            {a.activity}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm text-slate-500 max-w-[220px] truncate"
                        title={a.detail}>
                        {a.detail}
                      </td>
                      <td className="py-3 pr-4 text-sm font-mono text-slate-600">
                        #{a.tokenId}
                      </td>
                      <td className="py-3">
                        <a
                          href={`${POLYGONSCAN_URL}/tx/${a.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-mono text-indigo-500 hover:text-indigo-700 transition-colors"
                        >
                          {a.transactionHash.slice(0, 8)}...
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Inline note about verification tracking */}
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">Catatan:</span> Verifikasi sertifikat bersifat off-chain (read-only call ke contract) sehingga tidak tercatat sebagai event on-chain. Jumlah verifikasi dilacak secara lokal di browser.
                </p>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}