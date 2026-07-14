import { AnimatedSection, AnimatedHeading, AnimatedText, AnimatedImage } from './AnimatedWrapper'

export default function HeroSection() {
  return (
    <AnimatedSection style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden', position: 'relative',
      background: '#F8FAFF'
    }}>
      <div style={{
        position: 'absolute', top: '10%', left: '5%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(99,102,241,0.07),transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(59,130,246,0.07),transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none'
      }} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center w-full px-6 pt-28 pb-16 md:py-32" style={{ maxWidth: 1152, margin: '0 auto' }}>
        <div className="flex flex-col text-center md:text-left items-center md:items-start" style={{ gap: 24 }}>
          <AnimatedText delay={0.1}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              color: '#6366F1', border: '1px solid rgba(99,102,241,0.28)',
              background: 'rgba(99,102,241,0.07)', width: 'fit-content'
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1', animation: 'pulse 2s infinite' }} />
              Platform Blockchain Terdesentralisasi
            </div>
          </AnimatedText>
 
          <AnimatedHeading>
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] leading-[1.1]" style={{ fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-1px' }}>
              Verifikasi Sertifikat<br />Webinar dalam{' '}
              <span style={{ background: 'linear-gradient(90deg,#6366F1,#3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Hitungan Detik
              </span>
            </h1>
          </AnimatedHeading>
 
          <AnimatedText delay={0.2}>
            <p className="mx-auto md:mx-0 text-base md:text-[17px]" style={{ color: '#475569', lineHeight: 1.7, maxWidth: 420, margin: 0 }}>
              Platform berbasis blockchain untuk verifikasi sertifikat webinar yang aman, transparan, dan tidak dapat dimanipulasi.
            </p>
          </AnimatedText>
 
          <AnimatedText delay={0.3}>
            <div className="flex flex-wrap justify-center md:justify-start" style={{ gap: 12 }}>
              <a href="/connect" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', fontSize: 14, fontWeight: 700, color: '#fff',
                background: 'linear-gradient(135deg,#6366F1,#3B82F6)',
                borderRadius: 14, textDecoration: 'none',
                boxShadow: '0 8px 32px rgba(99,102,241,0.25)'
              }}>
                Mulai Verifikasi
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>
              <a href="#how-it-works" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', fontSize: 14, fontWeight: 500, color: '#475569',
                border: '1px solid #CBD5E1', borderRadius: 14, textDecoration: 'none',
                background: '#fff'
              }}>
                Pelajari cara kerja
              </a>
            </div>
          </AnimatedText>
 
          <AnimatedText delay={0.4}>
            <div className="flex flex-wrap justify-center md:justify-start" style={{ gap: 20, paddingTop: 4 }}>
              {['Blockchain Terdesentralisasi', 'Verifikasi Real-time', 'Tidak Bisa Dipalsukan'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="#22C55E"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  {t}
                </div>
              ))}
            </div>
          </AnimatedText>
        </div>
 
        <AnimatedImage direction="right" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img
            src="/image/visual-hero-removebg.png"
            alt="Verifikasi Sertifikat Hero Visual"
            style={{
              width: '100%',
              maxWidth: 480,
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 24px 48px rgba(99,102,241,0.18))',
            }}
          />
        </AnimatedImage>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </AnimatedSection>
  )
}
