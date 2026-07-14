import { AnimatedSection, AnimatedHeading, AnimatedText, AnimatedGrid, AnimatedGridItem } from './AnimatedWrapper'

export default function ForWhoSection() {
  return (
    <AnimatedSection style={{ padding: '80px 0', background: '#F8FAFF' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <AnimatedHeading>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Untuk Siapa Verifikasi Sertifikat?
            </h2>
          </AnimatedHeading>
          <AnimatedText delay={0.2}>
            <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>
              Solusi tepat untuk penyelenggara dan penerima sertifikat webinar
            </p>
          </AnimatedText>
        </div>
        <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatedGridItem style={{
            borderRadius: 20, padding: '32px 28px',
            background: 'linear-gradient(135deg,#F5F3FF,#EEF2FF)',
            border: '1px solid #DDD6FE'
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, fontSize: 24,
              background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16
            }}>🎙️</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', margin: '0 0 10px' }}>Penyelenggara Webinar</h3>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65, margin: '0 0 18px' }}>
              Terbitkan sertifikat yang terjamin keasliannya, tersimpan permanen di blockchain tanpa perlu server sendiri.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Terbitkan sertifikat massal (batch)', 'Otomatisasi via upload CSV', 'QR Code ter-generate otomatis'].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#475569' }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="#6366F1"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  {item}
                </li>
              ))}
            </ul>
          </AnimatedGridItem>

          <AnimatedGridItem style={{
            borderRadius: 20, padding: '32px 28px',
            background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)',
            border: '1px solid #BFDBFE'
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, fontSize: 24,
              background: 'linear-gradient(135deg,#3B82F6,#06B6D4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16
            }}>👤</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', margin: '0 0 10px' }}>Peserta & Verifikator</h3>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65, margin: '0 0 18px' }}>
              Verifikasi keaslian sertifikat kapan saja, di mana saja. Tidak perlu akun atau konfirmasi dari penyelenggara.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Scan QR Code untuk verifikasi instan', 'Akses bukti di blockchain publik', 'Tidak perlu registrasi akun'].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#475569' }}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="#3B82F6"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  {item}
                </li>
              ))}
            </ul>
          </AnimatedGridItem>
        </AnimatedGrid>
      </div>
    </AnimatedSection>
  )
}
