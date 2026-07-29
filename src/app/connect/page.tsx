'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '80002')
const TARGET_CHAIN_HEX = `0x${TARGET_CHAIN_ID.toString(16)}`
const TARGET_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology'
// RPC publik untuk DIDAFTARKAN ke wallet. Wallet (Brave/MetaMask) memvalidasi
// URL ini; URL Alchemy ber-API-key sering ditolak dengan error 'HTTP Status code: -1'.
// RPC Alchemy tetap dipakai aplikasi untuk membaca data di background.
const WALLET_RPC_URL = 'https://rpc-amoy.polygon.technology'
const TARGET_EXPLORER_URL = process.env.NEXT_PUBLIC_POLYGONSCAN_URL || 'https://amoy.polygonscan.com'
const TARGET_CHAIN_NAME = TARGET_CHAIN_ID === 137 ? 'Polygon Mainnet' : 'Polygon Amoy Testnet'

// Wallet option type
interface WalletOption {
  id: string
  name: string
  icon: string
  primary?: boolean
  available: boolean
}

const walletOptions: WalletOption[] = [
  { id: 'metamask', name: 'Masuk dengan MetaMask', icon: '🦊', primary: true, available: true },
  { id: 'walletconnect', name: 'WalletConnect', icon: '🔵', primary: false, available: false },
  { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔷', primary: false, available: false },
  { id: 'trust', name: 'Trust Wallet', icon: '🛡️', primary: false, available: false },
]

export default function ConnectPage() {
  const router = useRouter()
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect(wallet: WalletOption) {
    if (!wallet.available) return

    setError(null)
    setConnecting(wallet.id)

    try {
      if (wallet.id === 'metamask') {
        if (typeof window === 'undefined' || !window.ethereum) {
          setError('MetaMask tidak terdeteksi. Silakan install MetaMask terlebih dahulu.')
          setConnecting(null)
          return
        }

        // Request accounts
        await window.ethereum.request({ method: 'eth_requestAccounts' })

        // Pindah ke Polygon Amoy — bersifat best-effort. Kegagalan switch/add
        // (mis. error 'HTTP Status code: -1' dari Brave Wallet) TIDAK boleh
        // menggagalkan login: pembacaan data tetap jalan lewat RPC Alchemy.
        // Pengguna bisa pindah jaringan manual bila diperlukan untuk minting.
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' })
          if (chainId !== TARGET_CHAIN_HEX) {
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: TARGET_CHAIN_HEX }],
              })
            } catch (switchErr: unknown) {
              // Network belum ditambahkan — coba tambahkan (pakai RPC publik)
              if ((switchErr as { code: number }).code === 4902) {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: TARGET_CHAIN_HEX,
                    chainName: TARGET_CHAIN_NAME,
                    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                    rpcUrls: [WALLET_RPC_URL],
                    blockExplorerUrls: [TARGET_EXPLORER_URL],
                  }],
                })
              }
            }
          }
        } catch (netErr) {
          console.warn('Auto-switch jaringan gagal (diabaikan):', netErr)
        }

        router.push('/dashboard')
      }
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string }
      if (e.code === 4001) {
        setError('Koneksi ditolak. Silakan izinkan akses MetaMask.')
      } else {
        setError(e.message || 'Terjadi kesalahan saat menghubungkan wallet.')
      }
      setConnecting(null)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #4F1D96 0%, #1E40AF 50%, #0891B2 100%)' }}
    >
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #7C3AED, transparent)' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #06B6D4, transparent)' }} />

      {/* Glass Card */}
      <div
        className="relative z-10 w-full max-w-md rounded-3xl p-8 shadow-2xl"
        style={{
          background: 'rgba(15, 23, 60, 0.55)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-white mb-1 tracking-tight">Verifikasi Sertifikat</div>
          <h1 className="text-xl font-bold text-white mb-2">Portal Penyelenggara</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Masuk untuk menerbitkan sertifikat webinar terverifikasi
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-200 border border-red-400/30" style={{ background: 'rgba(239,68,68,0.15)' }}>
            {error}
          </div>
        )}

        {/* Wallet Buttons */}
        <div className="space-y-3">
          {walletOptions.map(wallet => (
            <button
              key={wallet.id}
              onClick={() => handleConnect(wallet)}
              disabled={connecting !== null || !wallet.available}
              className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl text-sm font-semibold transition-all ${wallet.primary
                  ? 'text-white hover:opacity-90 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99]'
                  : 'text-slate-200 border hover:bg-white/5 transition-colors cursor-not-allowed'
                } ${!wallet.available ? 'opacity-50' : ''}`}
              style={
                wallet.primary
                  ? { background: 'linear-gradient(135deg, #6366F1, #3B82F6)' }
                  : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' }
              }
            >
              <span className="text-lg">{wallet.icon}</span>
              {connecting === wallet.id ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Menghubungkan...
                </span>
              ) : (
                wallet.name
              )}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <span className="text-xs text-slate-400">atau</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Info box */}
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl mb-6"
          style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}
        >
          <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-xs text-slate-300 mb-0.5">Belum punya dompet digital?</p>
            <a
              href="https://metamask.io/download"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              Pelajari cara membuat MetaMask →
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mb-5" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '🔒', label: 'Aman &', sub: 'Terenkripsi' },
            { icon: '⚡', label: 'Terbitkan dalam', sub: 'Detik' },
            { icon: '📊', label: 'Dashboard', sub: 'Lengkap' },
          ].map((b, i) => (
            <div key={i}>
              <div className="text-xl mb-1">{b.icon}</div>
              <p className="text-xs text-slate-400 leading-tight">{b.label}<br />{b.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom links */}
      <div className="relative z-10 mt-6 text-center space-y-2">
        <Link href="/" className="flex items-center justify-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Kembali ke Beranda
        </Link>
        <p className="text-xs text-slate-400">
          Dengan masuk, Anda menyetujui{' '}
          <a href="#" className="text-blue-400 hover:underline">Syarat &amp; Ketentuan</a>
        </p>
        <div className="flex justify-center gap-3 text-xs text-slate-500">
          <a href="#" className="hover:text-slate-300 transition-colors">Syarat Layanan</a>
          <span>·</span>
          <a href="#" className="hover:text-slate-300 transition-colors">Kebijakan Privasi</a>
        </div>
      </div>
    </div>
  )
}