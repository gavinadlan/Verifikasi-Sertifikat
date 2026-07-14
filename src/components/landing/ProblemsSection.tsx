import { stats } from '@/constants/landingData'
import { AnimatedSection, AnimatedHeading, AnimatedText, AnimatedGrid, AnimatedGridItem } from './AnimatedWrapper'

function renderIcon(iconType: 'clock' | 'warning' | 'money') {
  if (iconType === 'clock') {
    return (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" />
      </svg>
    )
  }

  if (iconType === 'warning') {
    return (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    )
  }

  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default function ProblemsSection() {
  return (
    <AnimatedSection id="verifikasi" style={{ padding: '80px 0', background: '#fff' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <AnimatedHeading>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Masalah Verifikasi Sertifikat Webinar
            </h2>
          </AnimatedHeading>
          <AnimatedText delay={0.2}>
            <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>
              Sistem verifikasi tradisional menghadirkan berbagai kerugian yang harus segera diatasi
            </p>
          </AnimatedText>
        </div>
        <AnimatedGrid className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {stats.map((s, i) => (
            <AnimatedGridItem key={i} style={{
              borderRadius: 20, padding: '28px 24px',
              background: s.bg, border: `2px solid ${s.border}`
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: s.iconBg, color: s.iconColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16
              }}>{renderIcon(s.iconType)}</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: s.accent, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
              {s.unit && <div style={{ fontSize: 18, fontWeight: 700, color: s.accent, marginBottom: 10 }}>{s.unit}</div>}
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: 0 }}>{s.label}</p>
            </AnimatedGridItem>
          ))}
        </AnimatedGrid>
      </div>
    </AnimatedSection>
  )
}
