import { steps } from '@/constants/landingData'
import { AnimatedSection, AnimatedHeading, AnimatedText, AnimatedGrid, AnimatedGridItem } from './AnimatedWrapper'

export default function HowItWorksSection() {
  return (
    <AnimatedSection id="how-it-works" style={{ padding: '80px 0', background: '#F8FAFF' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <AnimatedHeading>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Cara Kerja Sistem
            </h2>
          </AnimatedHeading>
          <AnimatedText delay={0.2}>
            <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>
              Proses sederhana namun powerful untuk verifikasi sertifikat yang aman
            </p>
          </AnimatedText>
        </div>
        <AnimatedGrid className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8" style={{ position: 'relative' }}>
          <div className="hidden md:block" style={{
            position: 'absolute', top: 32, left: '22%', right: '22%', height: 2,
            background: 'linear-gradient(90deg,#C7D2FE,#93C5FD,#C7D2FE)'
          }} />
          {steps.map((s, i) => (
            <AnimatedGridItem key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18, marginBottom: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                background: 'linear-gradient(135deg,#6366F1,#3B82F6)',
                boxShadow: '0 8px 24px rgba(99,102,241,0.32)', position: 'relative', zIndex: 1
              }}>
                {s.emoji}
                <span style={{
                  position: 'absolute', top: -8, right: -8,
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#0F172A', border: '2px solid #6366F1',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{s.num}</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: '0 0 10px' }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
            </AnimatedGridItem>
          ))}
        </AnimatedGrid>
      </div>
    </AnimatedSection>
  )
}
