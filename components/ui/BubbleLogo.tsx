/**
 * BubbleLogo placeholder — SVG circle với sheen đơn giản, không bị lỗi gradient ID conflict.
 * Thay logo riêng: đặt file vào /public/logo.svg rồi dùng <Image src="/logo.svg" />
 */
interface BubbleLogoProps {
  size?: number
  className?: string
}

export function BubbleLogo({ size = 32, className }: BubbleLogoProps) {
  // Unique gradient ID per instance to avoid SVG ID conflicts
  const gid = `bg${size}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id={gid} cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#d0f5fb" />
          <stop offset="55%" stopColor="#89e5f0" />
          <stop offset="100%" stopColor="#5dd4e8" stopOpacity="0.7" />
        </radialGradient>
      </defs>
      {/* Main sphere */}
      <circle cx="16" cy="16" r="13" fill={`url(#${gid})`} />
      {/* Outline */}
      <circle cx="16" cy="16" r="13" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
      {/* Top-left sheen */}
      <ellipse
        cx="11.5" cy="10.5" rx="4" ry="2.5"
        fill="rgba(255,255,255,0.55)"
        transform="rotate(-22 11.5 10.5)"
      />
      {/* Small dot reflection */}
      <circle cx="20" cy="8.5" r="1.4" fill="rgba(255,255,255,0.4)" />
    </svg>
  )
}
