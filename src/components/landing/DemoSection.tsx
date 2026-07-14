'use client'

import { useCallback, useRef, useState } from 'react'
import { QRCodeScanner } from '@/components/QRCodeScanner'
import { useContract } from '@/hooks/useContract'
import { CONTRACT_ADDRESS, IPFS_GATEWAY, POLYGONSCAN_URL } from '@/constants'
import { AnimatedSection, AnimatedHeading, AnimatedText } from './AnimatedWrapper'

export default function DemoSection() {
  const [tokenId, setTokenId] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  // Token ditemukan tapi sudah direvokasi — ditampilkan jingga, bukan merah
  const [revokedTokenId, setRevokedTokenId] = useState('')
  const [verifyData, setVerifyData] = useState<{
    certificateNumber: string
    recipientName: string
    role: 'Peserta' | 'Pembicara' | 'Panitia'
    eventTitle: string
    eventTheme?: string
    issueDate: string
    organizerName: string
    tokenId: string
  } | null>(null)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [showCameraScanner, setShowCameraScanner] = useState(false)
  const tokenIdInputRef = useRef<HTMLInputElement | null>(null)
  const { checkExists, checkCertificateValid, checkRevoked, getTokenURI } = useContract()

  const handlePopupScan = useCallback((scannedTokenId: string) => {
    setTokenId(scannedTokenId)
    setShowResult(false)
    setVerifyError('')
    setShowCameraScanner(false)
    setShowVerifyModal(false)
    tokenIdInputRef.current?.focus()
  }, [])

  const closeVerifyModal = useCallback(() => {
    setShowCameraScanner(false)
    setShowVerifyModal(false)
  }, [])

  const handleVerify = useCallback(async () => {
    const cleaned = tokenId.trim()
    if (!cleaned) {
      setVerifyError('Token ID wajib diisi')
      setShowResult(false)
      return
    }

    if (!/^\d+$/.test(cleaned)) {
      setVerifyError('Token ID harus berupa angka')
      setShowResult(false)
      return
    }

    setIsVerifying(true)
    setVerifyError('')
    setRevokedTokenId('')
    setShowResult(false)

    try {
      const exists = await checkExists(cleaned)
      if (!exists) {
        setVerifyError('Sertifikat tidak ditemukan di blockchain')
        return
      }

      const [isValid, isRevoked, tokenURI] = await Promise.all([
        checkCertificateValid(cleaned),
        checkRevoked(cleaned),
        getTokenURI(cleaned),
      ])

      if (isRevoked) {
        setRevokedTokenId(cleaned)
        return
      }

      if (!isValid) {
        setVerifyError('Sertifikat ditemukan tetapi statusnya tidak valid')
        return
      }

      const cleanCID = tokenURI.replace('ipfs://', '')
      const metadataRes = await fetch(`${IPFS_GATEWAY}${cleanCID}`)
      if (!metadataRes.ok) {
        throw new Error('Failed to fetch metadata')
      }

      const metadata = await metadataRes.json()
      const getAttr = (trait: string) =>
        metadata.attributes?.find((a: { trait_type?: string; value?: string }) => a.trait_type === trait)?.value || ''

      setVerifyData({
        certificateNumber: getAttr('Nomor Sertifikat') || `CERT-${new Date().getFullYear()}-${cleaned.padStart(3, '0')}`,
        recipientName: getAttr('Nama Penerima') || '-',
        role: (getAttr('Peran') || 'Peserta') as 'Peserta' | 'Pembicara' | 'Panitia',
        eventTitle: getAttr('Nama Event') || metadata.name || '-',
        eventTheme: getAttr('Tema Event') || '',
        issueDate: getAttr('Tanggal Penerbitan') || '-',
        organizerName: getAttr('Penyelenggara') || '-',
        tokenId: cleaned,
      })
      setShowResult(true)
    } catch (error) {
      console.error('Landing verification failed:', error)
      setVerifyError('Gagal mengambil data verifikasi dari blockchain')
      setShowResult(false)
    } finally {
      setIsVerifying(false)
    }
  }, [tokenId, checkExists, checkCertificateValid, checkRevoked, getTokenURI])

  const qrPattern = [
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0],
    [0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1],
    [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
  ]

  return (
    <AnimatedSection style={{ padding: '80px 0', background: '#fff' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <AnimatedHeading>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              Coba Verifikasi Sertifikat
            </h2>
          </AnimatedHeading>
          <AnimatedText delay={0.2}>
            <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>
              Masukkan ID Sertifikat atau scan QR Code untuk mencoba verifikasi
            </p>
          </AnimatedText>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center" style={{ maxWidth: 760, margin: '0 auto' }}>
          <AnimatedText delay={0.3} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                padding: 16, borderRadius: 20, border: '2px dashed #E2E8F0',
                background: '#F8FAFF', display: 'inline-block', cursor: 'pointer'
              }}
              onClick={() => {
                setShowVerifyModal(true)
                setShowCameraScanner(false)
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setShowVerifyModal(true)
                  setShowCameraScanner(false)
                }
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(19, 9px)', gap: 1 }}>
                {qrPattern.flat().map((cell, i) => (
                  <div key={i} style={{
                    width: 9, height: 9, borderRadius: 1,
                    background: cell ? '#1E293B' : 'transparent'
                  }} />
                ))}
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Pindai QR Code melalui kamera</p>
          </AnimatedText>

          <AnimatedText delay={0.4} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                Masukkan ID Sertifikat
              </label>
              <input
                ref={tokenIdInputRef}
                type="text"
                value={tokenId}
                onChange={e => {
                  setTokenId(e.target.value)
                  setVerifyError('')
                  setRevokedTokenId('')
                  setShowResult(false)
                }}
                placeholder="Contoh: 42"
                style={{
                  width: '100%', padding: '12px 16px', fontSize: 14,
                  border: '1.5px solid #E2E8F0', borderRadius: 12,
                  outline: 'none', boxSizing: 'border-box',
                  color: '#1E293B', background: '#fff',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#6366F1'}
                onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#E2E8F0'}
              />
            </div>
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              style={{
                width: '100%', padding: '13px', fontSize: 14, fontWeight: 700,
                color: '#fff', border: 'none', cursor: isVerifying ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg,#6366F1,#3B82F6)',
                borderRadius: 12, transition: 'opacity 0.2s', opacity: isVerifying ? 0.75 : 1
              }}
            >
              {isVerifying ? 'Memverifikasi...' : 'Verifikasi Sekarang'}
            </button>

            {verifyError && (
              <div style={{
                borderRadius: 12, padding: '12px 14px', border: '1.5px solid #FECACA',
                background: '#FEF2F2', fontSize: 13, color: '#B91C1C'
              }}>
                {verifyError}
              </div>
            )}

            {revokedTokenId && (
              <div style={{
                borderRadius: 12, padding: '12px 14px', border: '1.5px solid #FED7AA',
                background: '#FFF7ED', fontSize: 13, color: '#C2410C'
              }}>
                <span style={{ fontWeight: 700 }}>⊘ Sertifikat Telah Direvokasi.</span>{' '}
                Sertifikat ini pernah diterbitkan secara sah, tetapi telah dicabut oleh penerbit.
                <a
                  href={`/verify/${revokedTokenId}`}
                  style={{
                    display: 'block', marginTop: 8, fontWeight: 700,
                    color: '#C2410C', textDecoration: 'underline'
                  }}
                >
                  Lihat Detail Lengkap →
                </a>
              </div>
            )}

            {showResult && verifyData && (
              <div style={{
                borderRadius: 14, padding: '16px', border: '1.5px solid #BBF7D0',
                background: '#F0FDF4', animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#15803D' }}>Status: Terverifikasi</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { label: 'Nomor', value: verifyData.certificateNumber },
                    { label: 'Penerima', value: verifyData.recipientName },
                    { label: 'Peran', value: verifyData.role },
                    { label: 'Nama Event', value: verifyData.eventTitle },
                    ...(verifyData.eventTheme ? [{ label: 'Tema', value: verifyData.eventTheme }] : []),
                    { label: 'Tanggal', value: verifyData.issueDate },
                    { label: 'Penyelenggara', value: verifyData.organizerName },
                    { label: 'Token ID', value: verifyData.tokenId },
                  ].map(row => (
                    <div key={row.label} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4" style={{ fontSize: 13, borderBottom: '1px solid rgba(0,0,0,0.02)', padding: '4px 0' }}>
                      <span style={{ color: '#94A3B8' }} className="shrink-0">{row.label}:</span>
                      <span style={{ fontWeight: 600, color: '#374151' }} className="break-all sm:text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
                <a
                  href={`${POLYGONSCAN_URL}/token/${CONTRACT_ADDRESS}?a=${verifyData.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none', display: 'block', marginTop: 10 }}
                >
                  Lihat di blockchain explorer →
                </a>
                {/* Tautan ke halaman verifikasi lengkap (QR code + verifikasi
                    tanda tangan digital issuer via ECDSA recovery) */}
                <a
                  href={`/verify/${verifyData.tokenId}`}
                  style={{
                    display: 'block', textAlign: 'center', marginTop: 12,
                    padding: '11px 14px', borderRadius: 12, fontSize: 13,
                    fontWeight: 700, color: '#fff', textDecoration: 'none',
                    background: 'linear-gradient(135deg,#6366F1,#3B82F6)'
                  }}
                >
                  Lihat Detail Lengkap &amp; Tanda Tangan Digital →
                </a>
              </div>
            )}
          </AnimatedText>
        </div>
      </div>
      {showVerifyModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(15,23,42,0.55)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 20
          }}
          onClick={closeVerifyModal}
        >
          <div
            style={{
              width: '100%', maxWidth: 360, borderRadius: 18, background: '#fff',
              border: '1px solid #E2E8F0', boxShadow: '0 20px 45px rgba(15,23,42,0.3)',
              padding: 22
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 18px', textAlign: 'center' }}>
              Verifikasi Sertifikat
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!showCameraScanner && (
                <button
                  onClick={() => setShowCameraScanner(true)}
                  style={{
                    border: 'none', cursor: 'pointer', textAlign: 'center', padding: '11px 14px',
                    borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#fff',
                    background: 'linear-gradient(135deg,#6366F1,#3B82F6)'
                  }}
                >
                  Buka Kamera
                </button>
              )}
              {showCameraScanner && (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 10, background: '#F8FAFF' }}>
                  <QRCodeScanner onScan={handlePopupScan} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </AnimatedSection>
  )
}
