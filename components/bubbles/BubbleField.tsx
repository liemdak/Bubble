'use client'

import { useMemo } from 'react'
import { BubbleFloat } from './BubbleFloat'

interface BubbleFieldProps {
  /** Number of bubbles to render */
  count?: number
  /** Size range in px: [min, max] */
  sizeRange?: [number, number]
  /** Opacity range: [min, max] */
  opacityRange?: [number, number]
  /** className for the container */
  className?: string
  /** Seed for deterministic layout (use same seed = same bubble positions) */
  seed?: number
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

export function BubbleField({
  count = 8,
  sizeRange = [24, 120],
  opacityRange = [0.06, 0.25],
  className = '',
  seed = 42,
}: BubbleFieldProps) {
  const bubbles = useMemo(() => {
    const rand = seededRandom(seed)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      size: sizeRange[0] + rand() * (sizeRange[1] - sizeRange[0]),
      x: rand() * 95,
      startY: rand() * 20,          // start near bottom
      duration: 6 + rand() * 14,    // 6–20s
      delay: rand() * 8,            // 0–8s stagger
      opacity: opacityRange[0] + rand() * (opacityRange[1] - opacityRange[0]),
      colorIndex: Math.floor(rand() * 6),
    }))
  }, [count, sizeRange, opacityRange, seed])

  return (
    <div
      className={className}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {bubbles.map((b) => (
        <BubbleFloat key={b.id} {...b} />
      ))}
    </div>
  )
}
