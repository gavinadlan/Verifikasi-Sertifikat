'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { NAV_ITEMS } from '@/constants/dashboardData'
import { useWallet } from '@/hooks/useWallet'
import Sidebar from '@/components/dashboard/Sidebar'
import Topbar from '@/components/dashboard/Topbar'
import SearchPalette from '@/components/dashboard/SearchPalette'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()

    // ── Wallet (via hook) ──────────────────────────────────────────
    const { address: fullAddress, balance, isConnected, isInitializing, disconnect } = useWallet()

    // Derived display values
    const displayAddress = fullAddress ? `${fullAddress.slice(0, 6)}...${fullAddress.slice(-4)}` : '0x...'
    const username = fullAddress ? fullAddress.slice(2, 7).toUpperCase() : 'USER'
    const displayBalance = balance ? parseFloat(balance).toFixed(4) : '0.0000'

    // ── UI state ───────────────────────────────────────────────────
    const [showSearch, setShowSearch] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    // Redirect if not connected
    useEffect(() => {
        if (!isInitializing && !isConnected) router.push('/connect')
    }, [isInitializing, isConnected, router])

    // Keyboard shortcut Cmd/Ctrl+K for search
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true) }
            if (e.key === 'Escape') setShowSearch(false)
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [])

    function getBreadcrumbLabel(): string {
        const exact = NAV_ITEMS.find(i => i.exact && pathname === i.href)
        if (exact) return exact.label
        const match = NAV_ITEMS.filter(i => !i.exact && pathname.startsWith(i.href))
            .sort((a, b) => b.href.length - a.href.length)[0]
        return match ? match.label : 'Home'
    }

    function handleLogout() {
        disconnect()
        router.push('/')
    }

    // Don't render while initializing or redirecting
    if (isInitializing || !isConnected) return null

    return (
        <div className="flex min-h-screen bg-gray-50">

            {/* Search Command Palette */}
            <SearchPalette
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
            />

            {/* Mobile Sidebar Backdrop */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden cursor-pointer"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <Sidebar
                address={displayAddress}
                fullAddress={fullAddress ?? ''}
                username={username}
                balance={displayBalance}
                onLogout={handleLogout}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Main */}
            <main className="ml-0 md:ml-44 flex-1 min-w-0 flex flex-col">

                {/* Global Topbar */}
                <Topbar
                    breadcrumbLabel={getBreadcrumbLabel()}
                    username={username}
                    address={displayAddress}
                    fullAddress={fullAddress ?? ''}
                    balance={displayBalance}
                    onOpenSearch={() => setShowSearch(true)}
                    onLogout={handleLogout}
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                />

                {/* Page Content */}
                <div className="flex-1">
                    {children}
                </div>
            </main>
        </div>
    )
}