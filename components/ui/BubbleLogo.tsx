/**
 * BubbleLogo — Official 3-bubble cluster logo
 */
interface BubbleLogoProps {
  size?: number
  className?: string
}

export function BubbleLogo({ size = 32, className }: BubbleLogoProps) {
  const id = `bl${size}`
  // Aspect ratio 48×42
  const h = Math.round(size * 42 / 48)
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 48 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id={`${id}a`} cx="35%" cy="28%" r="72%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#E8F7FE" />
          <stop offset="100%" stopColor="#90D3EF" />
        </radialGradient>
        <radialGradient id={`${id}b`} cx="35%" cy="28%" r="72%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#E8F7FE" />
          <stop offset="100%" stopColor="#90D3EF" />
        </radialGradient>
      </defs>

      {/* ── Large bubble (lower-left) ── */}
      <circle cx="15" cy="27" r="13.5" fill={`url(#${id}a)`} stroke="#6EC2E2" strokeWidth="1.6" />
      {/* sheen */}
      <ellipse
        cx="9.5" cy="20"
        rx="4.2" ry="2.4"
        fill="white" fillOpacity="0.65"
        transform="rotate(-24 9.5 20)"
      />
      <circle cx="17.5" cy="17" r="1.4" fill="white" fillOpacity="0.38" />

      {/* ── Medium bubble (upper-right) ── */}
      <circle cx="35" cy="13.5" r="9" fill={`url(#${id}b)`} stroke="#6EC2E2" strokeWidth="1.4" />
      <ellipse
        cx="30.5" cy="8.5"
        rx="2.9" ry="1.7"
        fill="white" fillOpacity="0.65"
        transform="rotate(-24 30.5 8.5)"
      />
      <circle cx="38" cy="9"   r="0.95" fill="white" fillOpacity="0.35" />

      {/* ── Small bubble (lower-right) ── */}
      <circle cx="42.5" cy="31" r="5" fill={`url(#${id}b)`} stroke="#6EC2E2" strokeWidth="1.2" />
      <ellipse
        cx="40" cy="27.5"
        rx="1.6" ry="0.95"
        fill="white" fillOpacity="0.65"
        transform="rotate(-24 40 27.5)"
      />
    </svg>
  )
}
