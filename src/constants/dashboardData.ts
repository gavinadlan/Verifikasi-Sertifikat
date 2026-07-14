// ── Types ──────────────────────────────────────────────────────────
export type Notification = {
    id: number
    type: 'success' | 'error' | 'info' | 'warning'
    title: string
    desc: string
    time: string
    read: boolean
}

// ── Nav Items ──────────────────────────────────────────────────────
export const NAV_ITEMS = [
    { href: '/dashboard', icon: '🏠', label: 'Home', exact: true },
    { href: '/dashboard/issue', icon: '➕', label: 'Terbitkan Baru', exact: false },
    { href: '/dashboard/certificates', icon: '📄', label: 'Sertifikat Saya', exact: false },
    { href: '/dashboard/statistics', icon: '📊', label: 'Statistik', exact: false },
    { href: '/dashboard/settings', icon: '⚙️', label: 'Pengaturan', exact: false },
]

// ── Search Shortcuts ───────────────────────────────────────────────
export const SEARCH_SHORTCUTS = [
    { label: 'Home', href: '/dashboard', icon: '🏠' },
    { label: 'Terbitkan Baru', href: '/dashboard/issue', icon: '➕' },
    { label: 'Sertifikat Saya', href: '/dashboard/certificates', icon: '📄' },
    { label: 'Statistik', href: '/dashboard/statistics', icon: '📊' },
    { label: 'Pengaturan', href: '/dashboard/settings', icon: '⚙️' },
]

// ── Mock Notifications ─────────────────────────────────────────────
export const MOCK_NOTIFS: Notification[] = [
    { id: 1, type: 'success', title: 'Sertifikat Berhasil Diterbitkan', desc: 'Token #42 — Workshop Web3 Development', time: '2 menit lalu', read: false },
    { id: 2, type: 'success', title: 'Batch Minting Selesai', desc: '25 sertifikat berhasil diterbitkan', time: '1 jam lalu', read: false },
    { id: 3, type: 'warning', title: 'Saldo Gas Rendah', desc: 'Saldo MATIC Anda kurang dari 0.5', time: '3 jam lalu', read: true },
    { id: 4, type: 'info', title: 'Verifikasi Publik', desc: 'Token #38 diverifikasi oleh publik', time: '5 jam lalu', read: true },
]

// ── Notification Styles ────────────────────────────────────────────
export const NOTIF_COLOR: Record<string, string> = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#6366F1',
}
export const NOTIF_BG: Record<string, string> = {
    success: '#ECFDF5',
    error: '#FEF2F2',
    warning: '#FFFBEB',
    info: '#EEF2FF',
}
export const NOTIF_ICON: Record<string, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
}
