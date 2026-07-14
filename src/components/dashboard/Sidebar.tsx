'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/constants/dashboardData'

interface Props {
    address: string
    fullAddress: string
    username: string
    balance: string
    onLogout: () => void
    isOpen?: boolean
    onClose?: () => void
}

export default function Sidebar({ address, fullAddress, username, balance, onLogout, isOpen, onClose }: Props) {
    const pathname = usePathname()
    const [copied, setCopied] = useState(false)

    function isActive(item: typeof NAV_ITEMS[0]) {
        if (item.exact) return pathname === item.href
        return pathname.startsWith(item.href)
    }

    function copyAddress() {
        navigator.clipboard.writeText(fullAddress)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <aside className={`fixed left-0 top-0 bottom-0 w-44 flex flex-col z-50 border-r border-gray-200 bg-white transition-transform duration-300 overflow-hidden md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="px-4 pt-5 pb-4">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#6366F1,#3B82F6)' }}>
                            V
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 leading-tight truncate">Verifikasi Sertifikat</p>
                            <p className="text-xs text-slate-400 truncate">{username}</p>
                        </div>
                    </div>
                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="md:hidden p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                        aria-label="Close menu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="rounded-xl p-3 mb-1" style={{ background: '#F8FAFF', border: '1px solid #E0E7FF' }}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">Wallet</span>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors" onClick={copyAddress} title={copied ? 'Tersalin!' : 'Salin alamat'}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                    <p className="text-xs font-mono font-medium text-slate-700 truncate">{address || '0x...'}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-xs text-green-600 font-medium">Terhubung</span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                {NAV_ITEMS.map(item => (
                    <Link key={item.href} href={item.href}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                        style={isActive(item)
                            ? { background: 'linear-gradient(135deg,#6366F1,#3B82F6)', color: 'white' }
                            : { color: '#64748B' }
                        }
                    >
                        <span className="text-sm">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="p-3 border-t border-gray-100">
                <div className="rounded-xl p-3 mb-2" style={{ background: '#F8FAFF', border: '1px solid #E0E7FF' }}>
                    <p className="text-xs text-slate-400 mb-0.5">Saldo</p>
                    <p className="text-sm font-bold text-slate-800">{balance} MATIC</p>
                    <div className="flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span className="text-xs text-slate-400">Polygon Network</span>
                    </div>
                </div>
                <button onClick={onLogout}
                    className="w-full py-2 rounded-xl text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-all">
                    Keluar
                </button>
            </div>
        </aside>
    )
}
