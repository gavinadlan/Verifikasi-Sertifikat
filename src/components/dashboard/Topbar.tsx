'use client'

import NotificationMenu from './NotificationMenu'
import ProfileMenu from './ProfileMenu'

interface Props {
    breadcrumbLabel: string
    username: string
    address: string
    fullAddress: string
    balance: string
    onOpenSearch: () => void
    onLogout: () => void
    onToggleSidebar: () => void
}

export default function Topbar({ breadcrumbLabel, username, address, fullAddress, balance, onOpenSearch, onLogout, onToggleSidebar }: Props) {
    return (
        <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-white border-b border-gray-100 sticky top-0 z-30">
            <div className="flex items-center gap-3">
                {/* Hamburger menu button for mobile */}
                <button
                    onClick={onToggleSidebar}
                    className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none transition-colors"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                    aria-label="Toggle Sidebar"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Breadcrumb */}
                <nav className="flex items-center gap-1 text-sm text-slate-400">
                    <span className="hidden sm:inline">Dashboard</span>
                    <span className="hidden sm:inline mx-1">›</span>
                    <span className="text-slate-700 font-medium">{breadcrumbLabel}</span>
                </nav>
            </div>

            <div className="flex items-center gap-2">
                {/* Search Button */}
                <button
                    onClick={onOpenSearch}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-slate-400 border border-gray-200 hover:border-indigo-300 hover:text-indigo-500 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="hidden sm:inline">Cari...</span>
                    <kbd className="hidden sm:inline px-1.5 py-0.5 text-xs rounded border border-gray-200 font-mono leading-none">⌘K</kbd>
                </button>

                {/* Notification Dropdown */}
                <NotificationMenu />

                {/* Profile Dropdown */}
                <ProfileMenu
                    username={username}
                    address={address}
                    fullAddress={fullAddress}
                    balance={balance}
                    onLogout={onLogout}
                />
            </div>
        </header>
    )
}
