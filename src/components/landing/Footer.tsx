import { footerLinks } from '@/constants/landingData'

export default function Footer() {
  return (
    <footer id="contact" style={{ background: '#080C1A', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '48px 24px 32px' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8" style={{ marginBottom: 40 }}>
          <div className="md:col-span-2">
            <span style={{
              fontSize: 22, fontWeight: 800,
              background: 'linear-gradient(90deg,#60A5FA,#818CF8)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>Verifikasi Sertifikat</span>
            <p className="max-w-none md:max-w-[260px]" style={{ fontSize: 14, color: '#475569', marginTop: 14, lineHeight: 1.65 }}>
              Platform verifikasi sertifikat webinar berbasis blockchain yang aman, transparan, dan terdesentralisasi.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#CBD5E1', marginBottom: 16, marginTop: 0 }}>Tautan Cepat</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {footerLinks.map(item => (
                <li key={item.label}><a href={item.href} style={{ fontSize: 14, color: '#475569', textDecoration: 'none' }}>{item.label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#CBD5E1', marginBottom: 16, marginTop: 0 }}>Ikuti Kami</h4>
            <div style={{ display: 'flex', gap: 10 }}>
              {['𝕏', 'in', '⬡', '✉'].map((icon, i) => (
                <a key={i} href="#" style={{
                  width: 38, height: 38, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: '#64748B',
                  border: '1px solid rgba(100,116,139,0.35)',
                  textDecoration: 'none', transition: 'all 0.2s'
                }}>{icon}</a>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4" style={{
          paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)'
        }}>
          <p style={{ fontSize: 13, color: '#334155', margin: 0 }}>© 2026 Verifikasi Sertifikat. Hak cipta dilindungi.</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Syarat Layanan', 'Kebijakan Privasi'].map(t => (
              <a key={t} href="#" style={{ fontSize: 13, color: '#334155', textDecoration: 'none' }}>{t}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
