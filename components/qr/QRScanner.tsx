'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, RotateCcw, ScanLine } from 'lucide-react'

interface QRScannerProps {
  onScan: (address: string) => void
  onClose: () => void
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'scanning' | 'error'>('loading')
  const stopRef = useRef<(() => void) | null>(null)

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return
    setError(null)
    setStatus('loading')

    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (!result) return
          const raw = result.getText()
          // Support: bubblepay:0x... | ethereum:0x... | raw 0x...
          const address = raw.startsWith('bubblepay:')
            ? raw.replace('bubblepay:', '').split('?')[0]
            : raw.startsWith('ethereum:')
            ? raw.replace('ethereum:', '').split('?')[0]
            : raw.trim()

          controls.stop()
          stopRef.current = null
          onScan(address)
        }
      )

      stopRef.current = () => controls.stop()
      setStatus('scanning')
    } catch {
      setError('Camera access denied.\nPlease allow camera permissions and try again.')
      setStatus('error')
    }
  }, [onScan])

  useEffect(() => {
    startScanning()
    return () => { stopRef.current?.() }
  }, [startScanning])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 520,
            background: '#ffffff',
            borderRadius: '24px 24px 0 0',
            overflow: 'hidden',
          }}
        >
          {/* Handle bar */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0e0e0' }} />
          </div>

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(56,189,248,0.15)',
                border: '1px solid rgba(56,189,248,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Camera size={16} color="#5a8a00" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Scan QR Code</div>
                <div style={{ fontSize: 11, color: '#999' }}>Point at a Bubble QR to receive address</div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#f5f5f5', border: '1px solid #e8e8e8',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={15} color="#666" />
            </button>
          </div>

          {/* Camera viewport */}
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1',
            background: '#111',
            overflow: 'hidden',
          }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              autoPlay
              muted
              playsInline
            />

            {/* Loading shimmer */}
            {status === 'loading' && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 16, background: '#111',
              }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: '3px solid rgba(56,189,248,0.2)',
                    borderTopColor: '#38bdf8',
                  }}
                />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Starting camera…</span>
              </div>
            )}

            {/* Scanning overlay */}
            {status === 'scanning' && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Dark vignette */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(ellipse 60% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%)',
                  pointerEvents: 'none',
                }} />

                {/* Scan frame */}
                <div style={{ position: 'relative', width: 200, height: 200 }}>
                  {/* Corners */}
                  {[
                    { top: 0,  left: 0,  borderTopLeftRadius: 8 },
                    { top: 0,  right: 0, borderTopRightRadius: 8 },
                    { bottom: 0, left: 0, borderBottomLeftRadius: 8 },
                    { bottom: 0, right: 0, borderBottomRightRadius: 8 },
                  ].map((pos, i) => (
                    <div key={i} style={{
                      position: 'absolute',
                      width: 24, height: 24,
                      borderColor: '#38bdf8',
                      borderStyle: 'solid',
                      borderWidth: 0,
                      borderTopWidth: i < 2 ? 3 : 0,
                      borderBottomWidth: i >= 2 ? 3 : 0,
                      borderLeftWidth: i === 0 || i === 2 ? 3 : 0,
                      borderRightWidth: i === 1 || i === 3 ? 3 : 0,
                      ...pos,
                    }} />
                  ))}

                  {/* Animated scan line */}
                  <motion.div
                    animate={{ y: [0, 180, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    style={{
                      position: 'absolute',
                      left: 8, right: 8,
                      height: 2,
                      background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
                      borderRadius: 1,
                      top: 10,
                    }}
                  />

                  {/* Scan icon */}
                  <div style={{
                    position: 'absolute',
                    inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    opacity: 0.15,
                  }}>
                    <ScanLine size={80} color="#38bdf8" />
                  </div>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {status === 'error' && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 16, padding: 24, background: 'rgba(0,0,0,0.88)',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(255,80,80,0.15)',
                  border: '1px solid rgba(255,80,80,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Camera size={24} color="#ff6060" />
                </div>
                <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {error}
                </p>
                <button
                  onClick={startScanning}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: '#38bdf8', color: '#000',
                    border: 'none', borderRadius: 8,
                    padding: '10px 20px', fontWeight: 700,
                    fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: 'rgb(10,10,13) 1px 1px 0px 0px',
                  }}
                >
                  <RotateCcw size={14} />
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* Hint */}
          <div style={{ padding: '16px 20px 36px', textAlign: 'center' }}>
            <span style={{
              fontSize: 12, color: '#aaa',
              background: '#f8f8f8',
              border: '1px solid #eee',
              borderRadius: 100,
              padding: '6px 14px',
              display: 'inline-block',
            }}>
              Supports Bubble · Ethereum · raw wallet addresses
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
