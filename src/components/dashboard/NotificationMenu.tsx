'use client'

import { useEffect, useRef, useState } from 'react'
import { Notification, MOCK_NOTIFS, NOTIF_BG, NOTIF_ICON, NOTIF_COLOR } from '@/constants/dashboardData'

export default function NotificationMenu() {
    const [showNotif, setShowNotif] = useState(false)
    const [notifs, setNotifs] = useState<Notification[]>(MOCK_NOTIFS)
    const notifRef = useRef<HTMLDivElement>(null)

    const unreadCount = notifs.filter(n => !n.read).length

    function markAllRead() {
        setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    }

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    // Close on Escape
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setShowNotif(false)
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [])

    return (
        <div className="relative" ref={notifRef}>
            <button
                onClick={() => setShowNotif(v => !v)}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                        {unreadCount}
                    </span>
                )}
            </button>

            {showNotif && (
                <div className="absolute right-0 top-11 w-80 rounded-2xl shadow-xl overflow-hidden"
                    style={{ background: 'white', border: '1px solid #E2E8F0', zIndex: 50 }}>
                    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                        <div>
                            <p className="text-sm font-semibold text-slate-800">Notifikasi</p>
                            {unreadCount > 0 && (
                                <p className="text-xs text-slate-400">{unreadCount} belum dibaca</p>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead}
                                className="text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors">
                                Tandai semua dibaca
                            </button>
                        )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                        {notifs.map(n => (
                            <div key={n.id}
                                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                            >
                                <span className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                                    style={{ background: NOTIF_BG[n.type] }}>
                                    {NOTIF_ICON[n.type]}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 truncate">{n.title}</p>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{n.desc}</p>
                                    <p className="text-xs mt-1" style={{ color: NOTIF_COLOR[n.type] }}>{n.time}</p>
                                </div>
                                {!n.read && (
                                    <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: NOTIF_COLOR[n.type] }} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-gray-100">
                        <button className="w-full text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors text-center">
                            Lihat semua notifikasi →
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
