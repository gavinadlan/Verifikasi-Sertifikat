export interface NavItem {
  label: string
  href: string
}

export interface FooterLink {
  label: string
  href: string
}

export interface ProblemStat {
  value: string
  unit: string
  label: string
  accent: string
  bg: string
  border: string
  iconBg: string
  iconColor: string
  iconType: 'clock' | 'warning' | 'money'
}

export interface HowItWorksStep {
  num: string
  title: string
  desc: string
  emoji: string
}

export interface FeatureItem {
  emoji: string
  title: string
  desc: string
  bg: string
  color: string
}

export interface TechItem {
  name: string
  abbr: string
  color: string
  bg: string
  border: string
  image?: string
}

export interface ResultItem {
  value: string
  label: string
  sub: string
  color: string
  bg: string
  border: string
}

export const navItems: NavItem[] = [
  { label: 'Verifikasi', href: '#verifikasi' },
  { label: 'Fitur', href: '#features' },
  { label: 'Cara Kerja', href: '#how-it-works' },
  { label: 'Teknologi', href: '#technology' },
  { label: 'Kontak', href: '#contact' },
]

export const footerLinks: FooterLink[] = [
  { label: 'Verifikasi', href: '#' },
  { label: 'Fitur', href: '#' },
  { label: 'Cara Kerja', href: '#' },
  { label: 'Kontak', href: '#' },
]

export const stats: ProblemStat[] = [
  {
    value: '90-180',
    unit: 'Hari',
    label: 'Waktu verifikasi manual yang memakan waktu berhari-hari',
    accent: '#F97316',
    bg: '#FFF7ED',
    border: '#FED7AA',
    iconBg: '#FFEDD5',
    iconColor: '#F97316',
    iconType: 'clock',
  },
  {
    value: '67%',
    unit: '',
    label: 'Tingkat Pemalsuan dokumen sertifikat di Indonesia setiap tahun',
    accent: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FDE68A',
    iconBg: '#FEF3C7',
    iconColor: '#F59E0B',
    iconType: 'warning',
  },
  {
    value: 'Rp 5,1M',
    unit: '',
    label: 'Kerugian finansial akibat pemalsuan sertifikat di bidang pendidikan',
    accent: '#3B82F6',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    iconBg: '#DBEAFE',
    iconColor: '#3B82F6',
    iconType: 'money',
  },
]

export const steps: HowItWorksStep[] = [
  {
    num: '1',
    title: 'Terbitkan',
    desc: 'Penyelenggara mengunggah sertifikat dan data peserta. Sertifikat otomatis disimpan ke IPFS.',
    emoji: '📤',
  },
  {
    num: '2',
    title: 'Amankan',
    desc: 'Sertifikat direpresentasikan sebagai NFT di blockchain Polygon. Data tersimpan permanen.',
    emoji: '🔒',
  },
  {
    num: '3',
    title: 'Verifikasi',
    desc: 'Siapa pun dapat memverifikasi keaslian sertifikat melalui QR Code secara real-time.',
    emoji: '✅',
  },
]

export const features: FeatureItem[] = [
  {
    emoji: '⬡',
    title: 'Blockchain Polygon',
    desc: 'Teknologi Layer-2 yang cepat, murah, dan aman untuk penerbitan NFT sertifikat.',
    bg: '#F5F3FF',
    color: '#7C3AED',
  },
  {
    emoji: '📦',
    title: 'Penyimpanan IPFS',
    desc: 'File sertifikat tersimpan secara terdesentralisasi, tidak bisa dihapus atau dimanipulasi.',
    bg: '#ECFEFF',
    color: '#0891B2',
  },
  {
    emoji: '🏅',
    title: 'Sertifikat NFT',
    desc: 'Setiap sertifikat direpresentasikan sebagai NFT ERC-721 yang unik dan dapat diverifikasi.',
    bg: '#FFFBEB',
    color: '#D97706',
  },
  {
    emoji: '📱',
    title: 'Verifikasi QR Code',
    desc: 'Pemindaian QR Code untuk verifikasi instan, bisa dilakukan siapa saja tanpa akun.',
    bg: '#F0FDF4',
    color: '#16A34A',
  },
  {
    emoji: '📊',
    title: 'Dashboard Penyelenggara',
    desc: 'Kelola penerbitan sertifikat, lihat statistik, dan pantau semua sertifikat yang diterbitkan.',
    bg: '#EFF6FF',
    color: '#2563EB',
  },
  {
    emoji: '⚡',
    title: 'Verifikasi Real-time',
    desc: 'Hasil verifikasi muncul dalam hitungan detik langsung dari blockchain tanpa konfirmasi manual.',
    bg: '#FEF2F2',
    color: '#DC2626',
  },
]

export const techs: TechItem[] = [
  { name: 'Polygon', abbr: 'Po', color: '#7B3FE4', bg: 'rgba(123,63,228,0.15)', border: 'rgba(123,63,228,0.3)', image: '/image/logo-polygon.png' },
  { name: 'IPFS', abbr: 'IP', color: '#469EA2', bg: 'rgba(70,158,162,0.15)', border: 'rgba(70,158,162,0.3)', image: '/image/logo-ipfs.png' },
  { name: 'Next.js', abbr: 'Nx', color: '#e2e8f0', bg: 'rgba(226,232,240,0.1)', border: 'rgba(226,232,240,0.2)', image: '/image/logo-nextjs.png' },
  { name: 'TypeScript', abbr: 'TS', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', image: '/image/logo-ts.png' },
]

export const results: ResultItem[] = [
  {
    value: '85%',
    label: 'Akurasi',
    sub: 'Tingkat akurasi verifikasi sertifikat',
    color: '#10B981',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  {
    value: '<5',
    label: 'Detik',
    sub: 'Waktu verifikasi rata-rata',
    color: '#6366F1',
    bg: '#F5F3FF',
    border: '#C4B5FD',
  },
  {
    value: '>50%',
    label: 'Penghematan',
    sub: 'Penghematan biaya operasional',
    color: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  {
    value: '0',
    label: 'Manipulasi',
    sub: 'Tidak ada manipulasi data di blockchain',
    color: '#EF4444',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
]
