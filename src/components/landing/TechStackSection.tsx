'use client'

import Image from 'next/image'
import { techs } from '@/constants/landingData'
import { AnimatedSection, AnimatedHeading, AnimatedText, AnimatedGrid, AnimatedGridItem } from './AnimatedWrapper'

export default function TechStackSection() {
  return (
    <AnimatedSection id="technology" style={{ padding: '72px 0', background: 'linear-gradient(to right, #581C87, #1E3A8A 50%, #164E63)' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <AnimatedHeading>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
              Teknologi yang Digunakan
            </h2>
          </AnimatedHeading>
          <AnimatedText delay={0.2}>
            <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
              Dibangun dengan teknologi blockchain Polygon untuk transaksi cepat dan efisien
            </p>
          </AnimatedText>
        </div>
        <AnimatedGrid className="tech-grid" style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap', alignItems: 'center' }}>
          {techs.map((t, i) => (
            <AnimatedGridItem key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 88, height: 88, borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: t.bg,
                border: `1px solid ${t.border}`,
                padding: 14,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'
                    ; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${t.border}`
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                    ; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                }}
              >
                {t.image ? (
                  <Image
                    src={t.image}
                    alt={t.name}
                    width={56}
                    height={56}
                    style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                  />
                ) : (
                  <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.5px', color: t.color }}>
                    {t.abbr}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8' }}>{t.name}</span>
            </AnimatedGridItem>
          ))}
        </AnimatedGrid>
      </div>
    </AnimatedSection>
  )
}