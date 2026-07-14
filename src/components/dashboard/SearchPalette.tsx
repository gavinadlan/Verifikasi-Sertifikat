'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SEARCH_SHORTCUTS } from '@/constants/dashboardData'

interface Props {
    isOpen: boolean
    onClose: () => void
}

export default function SearchPalette({ isOpen, onClose }: Props) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) setTimeout(() => searchInputRef.current?.focus(), 50)
        else setSearchQuery('')
    }, [isOpen])

    const filteredSearch = SEARCH_SHORTCUTS.filter(s =>
        s.label.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-24"
            style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: 'white', border: '1px solid #E2E8F0' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
                    <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Cari halaman atau Token ID..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && filteredSearch.length > 0) {
                                router.push(filteredSearch[0].href)
                                onClose()
                            }
                        }}
                        className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                    />
                    <kbd className="px-2 py-0.5 text-xs text-slate-400 rounded border border-gray-200 font-mono">ESC</kbd>
                </div>

                {/* Results */}
                <div className="py-2 max-h-80 overflow-y-auto">
                    {searchQuery === '' && (
                        <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Halaman</p>
                    )}
                    {filteredSearch.length > 0 ? filteredSearch.map((item, i) => (
                        <button
                            key={i}
                            onClick={() => { router.push(item.href); onClose() }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-left"
                        >
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                                style={{ background: '#EEF2FF' }}>
                                {item.icon}
                            </span>
                            <div>
                                <p className="text-sm font-medium text-slate-700">{item.label}</p>
                                <p className="text-xs text-slate-400">{item.href}</p>
                            </div>
                        </button>
                    )) : (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm text-slate-400">Tidak ada hasil untuk &quot;{searchQuery}&quot;</p>
                        </div>
                    )}
                </div>

                <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4">
                    <span className="text-xs text-slate-400">⏎ Buka • ↑↓ Navigasi</span>
                    <span className="ml-auto text-xs text-slate-400">⌘K untuk membuka</span>
                </div>
            </div>
        </div>
    )
}
