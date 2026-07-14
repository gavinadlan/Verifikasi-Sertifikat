'use client'

import { features } from '@/constants/landingData'
import { AnimatedSection, AnimatedHeading, AnimatedText, AnimatedGrid, AnimatedGridItem } from './AnimatedWrapper'

export default function FeaturesSection() {
  return (
    <AnimatedSection id="features" style={{ padding: '80px 0', background: '#fff' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <AnimatedHeading>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Fitur Unggulan
            </h2>
          </AnimatedHeading>
          <AnimatedText delay={0.2}>
            <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>
              Teknologi terdepan untuk verifikasi sertifikat yang aman dan terpercaya
            </p>
          </AnimatedText>
        </div>
        <AnimatedGrid className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <AnimatedGridItem key={i} style={{
              borderRadius: 18, padding: '22px 20px',
              border: '1px solid #F1F5F9',
              background: '#fff', cursor: 'default',
              transition: 'box-shadow 0.2s, border-color 0.2s'
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.07)'; e.currentTarget.style.borderColor = '#E2E8F0' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#F1F5F9' }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: f.bg, fontSize: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14
              }}>{f.emoji}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </AnimatedGridItem>
          ))}
        </AnimatedGrid>
      </div>
    </AnimatedSection>
  )
}
