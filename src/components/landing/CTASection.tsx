'use client'

import { useState } from 'react'
import { AnimatedSection, AnimatedHeading, AnimatedText } from './AnimatedWrapper'

export default function CTASection() {
  const [email, setEmail] = useState('')
  return (
    <AnimatedSection style={{ padding: '80px 0', background: 'linear-gradient(135deg,#4F46E5,#7C3AED,#2563EB)' }}>
      <div style={{ maxWidth: 672, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <AnimatedHeading>
          <h2 style={{ fontSize: 34, fontWeight: 800, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
            Siap Modernisasi Verifikasi Sertifikat Webinar?
          </h2>
        </AnimatedHeading>
        <AnimatedText delay={0.2}>
          <p style={{ fontSize: 16, color: '#C7D2FE', margin: '0 0 36px', lineHeight: 1.65 }}>
            Bergabunglah dengan penyelenggara webinar yang menggunakan blockchain untuk memastikan sertifikat yang tidak bisa dipalsukan
          </p>
        </AnimatedText>
        <AnimatedText delay={0.3}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <a href="/connect" style={{
            padding: '13px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700,
            color: '#4F46E5', background: '#fff', textDecoration: 'none',
            transition: 'opacity 0.2s'
          }}>Mulai Sekarang</a>
          <a href="/verify" style={{
            padding: '13px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700,
            color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)',
            textDecoration: 'none', transition: 'background 0.2s'
          }}>Hubungi Kami</a>
          </div>
        </AnimatedText>
        <AnimatedText delay={0.4}>
          <div className="flex flex-col sm:flex-row" style={{ gap: 8, maxWidth: 380, margin: '0 auto' }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@contoh.com"
            style={{
              flex: 1, padding: '11px 16px', borderRadius: 12, fontSize: 14,
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff', outline: 'none'
            }}
          />
          <button style={{
            padding: '11px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            color: '#fff', background: 'rgba(255,255,255,0.2)', border: 'none',
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s'
          }}>Daftar</button>
        </div>
        </AnimatedText>
      </div>
    </AnimatedSection>
  )
}
