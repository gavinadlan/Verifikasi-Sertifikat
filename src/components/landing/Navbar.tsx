'use client'

import { useState } from 'react'
import { navItems } from '@/constants/landingData'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center',
      background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(14px)',
      borderBottom: '1px solid rgba(0,0,0,0.07)'
    }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px',
          background: 'linear-gradient(90deg,#60A5FA,#818CF8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>Verifikasi Sertifikat</span>

        <div className="hidden md:flex" style={{ gap: 32, alignItems: 'center' }}>
          {navItems.map(item => (
            <a key={item.label} href={item.href} style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = '#1E293B'}
              onMouseLeave={e => (e.target as HTMLElement).style.color = '#64748B'}>{item.label}</a>
          ))}
        </div>

        <div className="hidden md:flex" style={{ gap: 10, alignItems: 'center' }}>
          <a href="/connect" style={{
            padding: '8px 18px', fontSize: 13, fontWeight: 500, color: '#A78BFA',
            border: '1px solid rgba(139,92,246,0.55)', borderRadius: 10,
            textDecoration: 'none', transition: 'all 0.2s',
            background: 'rgba(139,92,246,0.06)'
          }}>Mulai Sekarang</a>
        </div>

        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex items-center justify-center p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          aria-label="Toggle Menu"
        >
          {menuOpen ? (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div style={{
          position: 'fixed', top: '64px', left: 0, right: 0,
          background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(10px)',
          zIndex: 40, display: 'flex', flexDirection: 'column',
          padding: '24px', gap: 20, borderBottom: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
          animation: 'slideDown 0.2s ease-out'
        }} className="md:hidden">
          {navItems.map(item => (
            <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} style={{
              fontSize: 15, fontWeight: 600, color: '#475569', textDecoration: 'none',
              paddingBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.02)'
            }}>
              {item.label}
            </a>
          ))}
          <a href="/connect" onClick={() => setMenuOpen(false)} style={{
            padding: '12px', fontSize: 14, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg,#6366F1,#3B82F6)', borderRadius: 12,
            textDecoration: 'none', textAlign: 'center', marginTop: '8px',
            boxShadow: '0 8px 24px rgba(99,102,241,0.2)'
          }}>
            Mulai Sekarang
          </a>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>
  )
}
