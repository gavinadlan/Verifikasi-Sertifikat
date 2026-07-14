'use client'

import { useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

interface Props {
  onScan: (result: string) => void
}

export function QRCodeScanner({ onScan }: Props) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    const elementId = 'qr-reader'
    const element = document.getElementById(elementId)
    if (!element) return

    const scanner = new Html5QrcodeScanner(
      elementId,
      { fps: 10, qrbox: { width: 220, height: 220 } },
      false
    )

    scannerRef.current = scanner

    scanner.render(
      (decodedText) => {
        try {
          const url = new URL(decodedText)
          const parts = url.pathname.split('/')
          const tokenId = parts[parts.length - 1]
          onScanRef.current(tokenId)
        } catch {
          onScanRef.current(decodedText)
        }
      },
      () => {}
    )

    return () => {
      scanner.clear().catch(() => {})
      scannerRef.current = null
    }
  }, [])

  return <div id="qr-reader" className="w-full max-w-md mx-auto" />
}
