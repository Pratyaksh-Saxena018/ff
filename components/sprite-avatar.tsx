"use client"

const CHARACTERS_IMG =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/characters-QIBN1bqNLemoIe8GbyZYNiVmXjVU91.png"

// The characters.png sprite sheet is 32px wide x 96px tall
// 2 columns (left/right facing), 6 rows (colors)
// Each sprite cell is 16x16
const colorRows: Record<string, number> = {
  blue: 0,
  red: 1,
  orange: 2,
  yellow: 3,
  green: 4,
  purple: 5,
}

interface SpriteAvatarProps {
  color: string
  direction?: "left" | "right"
  size?: number
  className?: string
}

export function SpriteAvatar({
  color,
  direction = "right",
  size = 32,
  className = "",
}: SpriteAvatarProps) {
  const row = colorRows[color] ?? 0
  const col = direction === "right" ? 1 : 0

  // The native sprite cell is 16x16.  We scale it up by (size / 16).
  const s = size / 16

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "hsl(var(--secondary))",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size,
          height: size,
          backgroundImage: `url(${CHARACTERS_IMG})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${32 * s}px ${96 * s}px`,
          backgroundPosition: `-${col * 16 * s}px -${row * 16 * s}px`,
          imageRendering: "pixelated",
        }}
      />
    </div>
  )
}
