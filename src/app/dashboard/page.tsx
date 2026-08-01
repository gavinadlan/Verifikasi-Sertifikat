'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useContract } from '@/hooks/useContract'
import { useStatistics } from '@/hooks/useStatistics'

type Period = '30D' | '7D' | '90D'

// ── Chart SVG ─────────────────────────────────────────────────────
function Chart({ minted, verified, labels }: { minted: number[]; verified: number[]; labels: string[] }) {
  const data = { minted, verified, labels }
  const W = 820
  const H = 180
  const MAX = Math.max(1, ...minted, ...verified) + 2
  const PAD_L = 40
  const PAD_B = 20

  function toXY(vals: number[]): { x: number; y: number }[] {
    if (vals.length === 0) return []
    if (vals.length === 1) {
      return [{
        x: PAD_L + W / 2,
        y: H - (vals[0] / MAX) * H,
      }]
    }
    return vals.map((v, i) => ({
      x: PAD_L + (i / (vals.length - 1)) * W,
      y: H - (v / MAX) * H,
    }))
  }

  function smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return ''
    const step = W / (pts.length - 1)
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i - 1].x + step * 0.35).toFixed(1)
      const cp1y = pts[i - 1].y.toFixed(1)
      const cp2x = (pts[i].x - step * 0.35).toFixed(1)
      const cp2y = pts[i].y.toFixed(1)
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`
    }
    return d
  }

  function areaPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return ''
    const linePath = smoothPath(pts)
    const last = pts[pts.length - 1]
    const first = pts[0]
    return `${linePath} L ${last.x.toFixed(1)} ${H + PAD_B} L ${first.x.toFixed(1)} ${H + PAD_B} Z`
  }

  const mintedPts = toXY(data.minted)
  const verifiedPts = toXY(data.verified)
  const yLabels = [0, 5, 10, 15, 20, 25, 30]
  const totalW = W + PAD_L + 10
  const totalH = H + PAD_B + 10

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      width="100%"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y gridlines */}
      {yLabels.map(v => {
        const y = H - (v / MAX) * H
        return (
          <g key={v}>
            <line x1={PAD_L} y1={y} x2={PAD_L + W} y2={y}
              stroke="#E2E8F0" strokeWidth="0.5" />
            <text x={PAD_L - 6} y={y + 4} textAnchor="end"
              fill="#94A3B8" fontSize="10">{v}</text>
          </g>
        )
      })}

      {/* X labels */}
      {data.labels.map((label, i) => {
        const x = data.labels.length <= 1
          ? PAD_L + W / 2
          : PAD_L + (i / (data.labels.length - 1)) * W
        return (
          <text key={label} x={x} y={H + PAD_B + 4}
            textAnchor="middle" fill="#94A3B8" fontSize="10">
            {label}
          </text>
        )
      })}

      {/* Purple area fill */}
      <path d={areaPath(mintedPts)} fill="url(#purpleGrad)" />

      {/* Purple line */}
      <path d={smoothPath(mintedPts)}
        fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />

      {/* Green line */}
      <path d={smoothPath(verifiedPts)}
        fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ icon, value, label, sub, subColor }: {
  icon: string; value: string; label: string; sub: string; subColor?: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-sm transition-shadow">
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-2xl font-bold text-slate-800 mb-0.5">{value}</div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-xs font-medium" style={{ color: subColor || '#10B981' }}>{sub}</div>
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    'Berhasil': { bg: '#ECFDF5', color: '#059669' },
    'Selesai': { bg: '#EFF6FF', color: '#2563EB' },
    '200 OK': { bg: '#F0FDFA', color: '#0891B2' },
    'Info': { bg: '#F8FAFC', color: '#64748B' },
    'Gagal': { bg: '#FEF2F2', color: '#DC2626' },
  }
  const style = map[status] || map['Info']
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: style.bg, color: style.color }}>
      {status}
    </span>
  )
}

// ── Main Dashboard Page ───────────────────────────────────────────
export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('30D')
  const [totalSupply, setTotalSupply] = useState<number>(0)
  const [username, setUsername] = useState<string>('GAVIN')
  const { getTotalSupply } = useContract();
  const { data, isLoading } = useStatistics();

  useEffect(() => {
    async function init() {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts[0]) {
            setUsername(accounts[0].slice(2, 7).toUpperCase())
          }
        } catch { /* ignore */ }
      }
      const supply = await getTotalSupply()
      setTotalSupply(supply)
    }
    init()
  }, [])

  useEffect(() => {
    if (data) {
      setTotalSupply(data.totalMinted)
    }
  }, [data])

  const periodDays = period === '7D' ? 7 : period === '30D' ? 30 : 90
  const filteredDaily = (data?.dailyMints ?? []).slice(-Math.min(periodDays, data?.dailyMints?.length ?? 0))
  const chartMinted = filteredDaily.map((d) => d.count)
  // Seri kedua dinonaktifkan: tidak ada data verifikasi on-chain yang bisa
  // dipetakan per hari (verifikasi tidak menghasilkan transaksi blockchain).
  const chartVerified: number[] = []
  const chartLabels = filteredDaily.map((d, idx) => {
    const date = new Date(`${d.date}T00:00:00`)
    const show = filteredDaily.length <= 7 || idx % Math.max(1, Math.floor(filteredDaily.length / 6)) === 0 || idx === filteredDaily.length - 1
    return show ? date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''
  })

  const stats = [
    { icon: '📄', value: totalSupply.toLocaleString(), label: 'Total Sertifikat Diterbitkan', sub: 'Terverifikasi On-Chain' },
    {
      icon: '✅',
      // Metrik on-chain: verifikasi publik tidak dapat dilacak dari blockchain
      // karena merupakan operasi baca (view function) tanpa transaksi.
      value: (data?.activeCertificates ?? 0).toLocaleString('id-ID'),
      label: 'Sertifikat Aktif',
      sub:
        (data?.revokedCertificates ?? 0) > 0
          ? `${data?.revokedCertificates} direvokasi`
          : 'Valid, belum direvokasi',
      subColor: (data?.revokedCertificates ?? 0) > 0 ? '#EA580C' : undefined,
    },
    {
      icon: '👥',
      value: (data?.uniqueRecipients ?? 0).toLocaleString('id-ID'),
      label: 'Penerima Unik',
      sub: 'Berdasarkan event mint on-chain',
      subColor: '#6366F1',
    },
    {
      icon: '💰',
      value: `${(data?.totalGasMatic ?? 0).toFixed(4)} MATIC`,
      label: 'Total Biaya Gas',
      sub: 'Akumulasi tx minting',
      subColor: '#F59E0B',
    },
  ]

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Scrollable content ────────────────────── */}
      <div className="flex-1 p-6 pb-24 space-y-6">

        {/* Welcome Banner */}
        <div className="rounded-2xl px-7 py-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg,#4F46E5 0%,#7C3AED 60%,#6366F1 100%)', minHeight: '110px' }}>
          {/* Background decoration */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10"
            style={{ background: 'radial-gradient(circle at 80% 50%,white,transparent)' }} />
          <div>
            <h1 className="text-xl font-bold text-white mb-1">
              Selamat Datang, {username}! 👋
            </h1>
            <p className="text-indigo-200 text-sm">Kelola dan terbitkan sertifikat webinar Anda dengan mudah</p>
          </div>
          <Link
            href="/dashboard/issue"
            className="flex-shrink-0 px-5 py-2.5 bg-white rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-all hover:shadow-md"
            style={{ color: '#4F46E5' }}
          >
            Terbitkan Sertifikat
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <StatCard key={i} {...s} />
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-800">
              Penerbitan Sertifikat - {period === '30D' ? '30' : period === '7D' ? '7' : '90'} Hari Terakhir
            </h2>
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: '#F1F5F9' }}>
              {(['30D', '7D', '90D'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  style={period === p
                    ? { background: 'linear-gradient(135deg,#6366F1,#3B82F6)', color: 'white' }
                    : { color: '#64748B' }
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-5 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded bg-purple-500 inline-block" />
              <span className="text-xs text-slate-500">Diterbitkan</span>
            </div>

          </div>
          {isLoading && !data ? (
            <div className="h-36 flex items-center justify-center text-sm text-slate-400">Memuat data blockchain...</div>
          ) : (
            <Chart minted={chartMinted} verified={chartVerified} labels={chartLabels} />
          )}
        </div>

        {/* Activity Table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-slate-800">Aktivitas Terbaru</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400">Waktu</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Aktivitas</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Detail</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.recentActivities ?? []).map((a, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-xs text-slate-500 whitespace-nowrap">{a.time}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-700 font-medium whitespace-nowrap">{a.activity}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{a.detail}</td>
                    <td className="px-6 py-3.5"><StatusBadge status="Berhasil" /></td>
                  </tr>
                ))}
                {!isLoading && (data?.recentActivities?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-sm text-slate-400 text-center">
                      Belum ada aktivitas on-chain.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-gray-50">
            <button className="text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors">
              Lihat semua aktivitas →
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Action Bar ──────────────────────── */}
      <div className="fixed bottom-0 right-0 left-0 md:left-44 bg-white border-t border-gray-100 px-4 py-3 md:px-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 z-30">
        <Link
          href="/dashboard/issue"
          className="flex-1 py-2.5 sm:py-3 rounded-xl text-sm font-semibold text-white text-center transition-all hover:opacity-90 hover:shadow-md"
          style={{ background: 'linear-gradient(135deg,#4F46E5,#6366F1,#3B82F6)' }}
        >
          Terbitkan Sertifikat Baru
        </Link>
        <div className="flex gap-2 sm:gap-3">
          <button className="flex-1 sm:flex-initial px-5 py-2.5 sm:py-3 rounded-xl text-sm font-medium text-slate-600 border border-gray-200 hover:bg-gray-50 transition-all whitespace-nowrap">
            Unduh Laporan
          </button>
          <button className="hidden sm:block px-5 py-3 rounded-xl text-sm font-medium text-slate-400 border border-gray-200 cursor-not-allowed whitespace-nowrap" disabled>
            Lihat Dokumentasi API
          </button>
        </div>
      </div>
    </div>
  )
}