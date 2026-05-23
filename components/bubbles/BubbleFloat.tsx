'use client'

import { motion } from 'framer-motion'

const BUBBLE_COLORS = [
  'rgba(163, 230, 53, 0.15)',   // Accent Green
  'rgba(137, 229, 240, 0.20)',  // Sky Breeze
  'rgba(210, 250, 229, 0.25)',  // Card Mint
  'rgba(250, 233, 255, 0.20)',  // Card Lavender
  'rgba(245, 209, 254, 0.18)',  // Card Pink
  'rgba(255, 255, 255, 0.30)',  // White
]

interface BubbleFloatProps {
  size: number       // px
  x: number          // % from left
  startY: number     // % from bottom (starting position)
  duration: number   // seconds
  delay: number      // seconds
  opacity: number
  colorIndex: number
}

export function BubbleFloat({ size, x, startY, duration, delay, opacity, colorIndex }: BubbleFloatProps) {
  const color = BUBBLE_COLORS[colorIndex % BUBBLE_COLORS.length]

  return (
    <motion.div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        left: `${x}%`,
        bottom: `${startY}%`,
        borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,0.4)',
        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), transparent 60%), ${color}`,
        backdropFilter: 'blur(2px)',
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0, y: 0, scale: 1 }}
      animate={{
        opacity: [0, opacity, opacity * 1.2, 0],
        y: [-0, -40, -80, -120],
        x: [0, 12, -8, 4],
        scale: [1, 1.03, 0.97, 0.95],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}
