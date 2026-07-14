import { results } from '@/constants/landingData'
import { AnimatedSection, AnimatedHeading, AnimatedText, AnimatedGrid, AnimatedGridItem } from './AnimatedWrapper'

export default function ResultsSection() {
  return (
    <AnimatedSection style={{ padding: '80px 0', background: '#fff' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <AnimatedHeading>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Hasil Nyata
            </h2>
          </AnimatedHeading>
          <AnimatedText delay={0.2}>
            <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>
              Data pengujian dari penerapan blockchain untuk verifikasi sertifikat
            </p>
          </AnimatedText>
        </div>
        <AnimatedGrid className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {results.map((r, i) => (
            <AnimatedGridItem key={i} style={{
              borderRadius: 20, padding: '24px 20px', textAlign: 'center',
              background: r.bg, border: `2px solid ${r.border}`
            }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: r.color, lineHeight: 1, marginBottom: 4 }}>{r.value}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 6 }}>{r.label}</div>
              <p style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5, margin: 0 }}>{r.sub}</p>
            </AnimatedGridItem>
          ))}
        </AnimatedGrid>
      </div>
    </AnimatedSection>
  )
}
