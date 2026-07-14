'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface Props {
    username: string
    address: string
    fullAddress: string
    balance: string
    onLogout: () => void
}

export default function ProfileMenu({ username, address, fullAddress, balance, onLogout }: Props) {
    const [showProfile, setShowProfile] = useState(false)
    const [copied, setCopied] = useState(false)
    const profileRef = useRef<HTMLDivElement>(null)

    function copyAddress() {
        navigator.clipboard.writeText(fullAddress)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function openExplorer() {
        window.open(`https://polygonscan.com/address/${fullAddress}`, '_blank')
    }

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    // Close on Escape
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setShowProfile(false)
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [])

    return (
        <div className="relative" ref={profileRef}>
            <button
                onClick={() => setShowProfile(v => !v)}
                className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 transition-all"
            >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#6366F1,#3B82F6)' }}>
                    {username.slice(0, 1)}
                </div>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {showProfile && (
                <div className="absolute right-0 top-11 w-64 rounded-2xl shadow-xl overflow-hidden"
                    style={{ background: 'white', border: '1px solid #E2E8F0', zIndex: 50 }}>
                    {/* Header */}
                    <div className="px-4 py-3.5 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg,#6366F1,#3B82F6)' }}>
                                {username.slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">{username}</p>
                                <p className="text-xs font-mono text-slate-500 truncate">{address}</p>
                            </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-xs text-green-600 font-medium">Terhubung · Polygon</span>
                            <span className="ml-auto text-xs font-semibold text-slate-700">{balance} MATIC</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="py-1.5">
                        <button onClick={copyAddress}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#F1F5F9' }}>
                                {copied ? '✅' : '📋'}
                            </span>
                            <span className="text-sm text-slate-700">{copied ? 'Tersalin!' : 'Salin Alamat Wallet'}</span>
                        </button>

                        <button onClick={openExplorer}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#F1F5F9' }}>🔗</span>
                            <div>
                                <p className="text-sm text-slate-700">Lihat di Polygonscan</p>
                                <p className="text-xs text-slate-400">Buka blockchain explorer</p>
                            </div>
                        </button>

                        <Link href="/dashboard/settings"
                            onClick={() => setShowProfile(false)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#F1F5F9' }}>⚙️</span>
                            <span className="text-sm text-slate-700">Pengaturan</span>
                        </Link>
                    </div>

                    <div className="border-t border-gray-100 py-1.5">
                        <button onClick={onLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-left">
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#FEF2F2' }}>🚪</span>
                            <span className="text-sm font-medium text-red-500">Keluar / Disconnect</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
