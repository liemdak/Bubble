'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface SuccessBurstProps {
  active: boolean
}

// 8 tiny bubbles burst out from center when tx confirms
const BURST_POSITIONS = [
  { angle: 0,   dist: 60 },
  { angle: 45,  dist: 70 },
  { angle: 90,  dist: 60 },
  { angle: 135, dist: 65 },
  { angle: 180, dist: 60 },
  { angle: 225, dist: 70 },
  { angle: 270, dist: 60 },
  { angle: 315, dist: 65 },
]

export function SuccessBurst({ active }: SuccessBurstProps) {
  return (
    <AnimatePresence>
      {active && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {BURST_POSITIONS.map(({ angle, dist }, i) => {
            const rad = (angle * Math.PI) / 180
            const tx = Math.cos(rad) * dist
            const ty = Math.sin(rad) * dist
            return (
              <motion.div
                key={i}
                style={{
                  position: 'absolute',
                  width: 12 + (i % 3) * 4,
                  height: 12 + (i % 3) * 4,
                  borderRadius: '50%',
                  background: i % 2 === 0
                    ? 'rgba(163, 230, 53, 0.8)'
                    : 'rgba(137, 229, 240, 0.7)',
                  border: '1px solid rgba(255,255,255,0.5)',
                }}
                initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.4, 1, 0],
                  x: [0, tx * 0.6, tx, tx * 1.2],
                  y: [0, ty * 0.6, ty, ty * 1.2],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.05,
                  ease: 'easeOut',
                }}
              />
            )
          })}
        </div>
      )}
    </AnimatePresence>
  )
}
