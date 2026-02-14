"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Gamepad2, TrendingUp, TrendingDown, Trophy, Palette } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const MAP_IMG = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/map-eNMoYEgCN7lt0YBMyg17jZwI7FhtMl.png"
const CHARACTERS_IMG = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/characters-QIBN1bqNLemoIe8GbyZYNiVmXjVU91.png"
const SHADOW_IMG = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/shadow-BShwg9Dinor1drsDDSocCbMZb8ch0j.png"
const COIN_IMG = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/coin-5Fh7ZkyBf7inrzhSB6ZT38fTYWN7Zk.png"
const COIN_SHADOW_IMG = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/coin-shadow-3zlnYYxvjVPbHC52H74SwP1FHNBAp5.png"
const ARROW_IMG = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/arrow-Q7l5DVXXnd9bYpp0drutEX44h7P1I2.png"

// Native game dimensions
const GAME_W = 240
const GAME_H = 208

const mapData = {
  minX: 1, maxX: 14, minY: 4, maxY: 12,
  blockedSpaces: {
    "7x4": true, "1x11": true, "12x10": true,
    "4x7": true, "5x7": true, "6x7": true,
    "8x6": true, "9x6": true, "10x6": true,
    "7x9": true, "8x9": true, "9x9": true,
  } as Record<string, boolean>,
}

const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"]

const colorYOffsets: Record<string, number> = {
  blue: 0, red: -16, orange: -32, yellow: -48, green: -64, purple: -80,
}

const nameWords = {
  prefix: ["COOL", "SUPER", "HIP", "SMUG", "SILKY", "GOOD", "SAFE", "DEAR", "WARM", "RICH", "DARK", "SOFT", "BUFF", "DOPE"],
  animal: ["BEAR", "DOG", "CAT", "FOX", "LAMB", "LION", "BOAR", "GOAT", "VOLE", "SEAL", "PUMA", "MULE", "BULL", "BIRD", "BUG"],
}

function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function getKey(x: number, y: number) { return `${x}x${y}` }
function createName() { return `${randomFrom(nameWords.prefix)} ${randomFrom(nameWords.animal)}` }
function isSolid(x: number, y: number) {
  return !!mapData.blockedSpaces[getKey(x, y)] || x >= mapData.maxX || x < mapData.minX || y >= mapData.maxY || y < mapData.minY
}

const safeSpots = [
  {x:1,y:4},{x:2,y:4},{x:1,y:5},{x:2,y:6},{x:2,y:8},{x:2,y:9},
  {x:4,y:8},{x:5,y:5},{x:5,y:8},{x:5,y:10},{x:5,y:11},{x:11,y:7},
  {x:12,y:7},{x:13,y:7},{x:13,y:6},{x:13,y:8},{x:7,y:6},{x:7,y:7},
  {x:7,y:8},{x:8,y:8},{x:10,y:8},{x:11,y:4},
]

type PlayerState = {
  id: string; name: string; color: string; x: number; y: number;
  direction: "left" | "right"; coins: number; isYou?: boolean
}

type CoinState = { x: number; y: number; key: string }

interface GamePanelProps {
  karma: number
  level: number
  gameXp: number
}

export function GamePanel({ karma, level, gameXp }: GamePanelProps) {
  const [player, setPlayer] = useState<PlayerState>(() => {
    const pos = randomFrom(safeSpots)
    return { id: "me", name: "YOU", color: "blue", ...pos, direction: "right", coins: 0, isYou: true }
  })
  const [npcs, setNpcs] = useState<PlayerState[]>(() =>
    [
      { id: "npc1", name: createName(), color: "red" },
      { id: "npc2", name: createName(), color: "orange" },
      { id: "npc3", name: createName(), color: "green" },
    ].map((n) => ({
      ...n,
      ...randomFrom(safeSpots),
      direction: randomFrom(["left", "right"]) as "left" | "right",
      coins: Math.floor(Math.random() * 15),
    }))
  )
  const [coins, setCoins] = useState<CoinState[]>([])
  const [playerName, setPlayerName] = useState(player.name)
  const playerRef = useRef(player)
  playerRef.current = player

  // Spawn coins periodically
  useEffect(() => {
    let cancelled = false
    function spawn() {
      if (cancelled) return
      const pos = randomFrom(safeSpots)
      const key = getKey(pos.x, pos.y)
      setCoins((prev) => {
        if (prev.some((c) => c.key === key)) return prev
        return [...prev.slice(-8), { ...pos, key }]
      })
      setTimeout(spawn, 2000 + Math.random() * 3000)
    }
    spawn()
    return () => { cancelled = true }
  }, [])

  // NPC random movement
  useEffect(() => {
    const interval = setInterval(() => {
      setNpcs((prev) =>
        prev.map((npc) => {
          const dirs = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: 0, dy: 0 }, { dx: 0, dy: 0 },
          ]
          const d = randomFrom(dirs)
          const nx = npc.x + d.dx
          const ny = npc.y + d.dy
          if (isSolid(nx, ny)) return npc
          return {
            ...npc,
            x: nx, y: ny,
            direction: d.dx === 1 ? "right" : d.dx === -1 ? "left" : npc.direction,
          }
        })
      )
    }, 800)
    return () => clearInterval(interval)
  }, [])

  // Movement
  const handleMove = useCallback((dx: number, dy: number) => {
    setPlayer((prev) => {
      const nx = prev.x + dx
      const ny = prev.y + dy
      if (isSolid(nx, ny)) return prev
      const newDir = dx === 1 ? "right" : dx === -1 ? "left" : prev.direction
      // Grab coin
      setCoins((cs) => {
        const key = getKey(nx, ny)
        const idx = cs.findIndex((c) => c.key === key)
        if (idx !== -1) {
          setPlayer((p) => ({ ...p, coins: p.coins + 1 }))
          return [...cs.slice(0, idx), ...cs.slice(idx + 1)]
        }
        return cs
      })
      return { ...prev, x: nx, y: ny, direction: newDir }
    })
  }, [])

  // Keyboard
  useEffect(() => {
    const keySafe: Record<string, boolean> = {}
    function onDown(e: KeyboardEvent) {
      if (keySafe[e.key] === false) return
      keySafe[e.key] = false
      switch (e.key) {
        case "ArrowUp": case "w": handleMove(0, -1); break
        case "ArrowDown": case "s": handleMove(0, 1); break
        case "ArrowLeft": case "a": handleMove(-1, 0); break
        case "ArrowRight": case "d": handleMove(1, 0); break
      }
    }
    function onUp(e: KeyboardEvent) { keySafe[e.key] = true }
    window.addEventListener("keydown", onDown)
    window.addEventListener("keyup", onUp)
    return () => {
      window.removeEventListener("keydown", onDown)
      window.removeEventListener("keyup", onUp)
    }
  }, [handleMove])

  function cycleColor() {
    setPlayer((prev) => {
      const idx = playerColors.indexOf(prev.color)
      const next = playerColors[(idx + 1) % playerColors.length]
      return { ...prev, color: next }
    })
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.toUpperCase().slice(0, 10)
    setPlayerName(v)
    setPlayer((prev) => ({ ...prev, name: v || "YOU" }))
  }

  const karmaMultiplier = karma >= 800 ? 1.3 : karma >= 500 ? 1.1 : karma >= 200 ? 1.0 : 0.8
  const xpProgress = (gameXp % 1000) / 10

  const allPlayers = [player, ...npcs]

  // Responsive scaling using container size
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(3)

  useEffect(() => {
    function calcScale() {
      const el = wrapperRef.current
      if (!el) return
      const { width, height } = el.getBoundingClientRect()
      const sx = (width - 16) / GAME_W
      const sy = (height - 16) / GAME_H
      setScale(Math.max(1, Math.min(sx, sy)))
    }
    calcScale()
    const ro = new ResizeObserver(calcScale)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  const S = scale

  return (
    <div className="flex h-full flex-col rounded-xl glass-card neon-border">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Multiplayer Arena</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-mono">
            Lv.{level}
          </Badge>
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-mono gap-1">
            <Trophy className="h-3 w-3" />
            {player.coins}
          </Badge>
        </div>
      </div>

      {/* Game Area */}
      <div ref={wrapperRef} className="flex flex-1 items-center justify-center overflow-hidden bg-[#1a1d27] p-2">
        <div
          className="relative"
          style={{
            width: GAME_W * S,
            height: GAME_H * S,
            backgroundImage: `url(${MAP_IMG})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${GAME_W * S}px ${GAME_H * S}px`,
            imageRendering: "pixelated",
          }}
        >
          {/* Coins */}
          {coins.map((coin) => (
            <div
              key={coin.key}
              className="absolute"
              style={{
                width: 16 * S,
                height: 16 * S,
                transform: `translate3d(${16 * coin.x * S}px, ${(16 * coin.y - 4) * S}px, 0)`,
                zIndex: coin.y,
              }}
            >
              <div
                className="absolute"
                style={{
                  width: 16 * S,
                  height: 16 * S,
                  backgroundImage: `url(${COIN_SHADOW_IMG})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${16 * S}px ${16 * S}px`,
                  imageRendering: "pixelated",
                }}
              />
              <div
                className="absolute animate-coin-float"
                style={{
                  width: 16 * S,
                  height: 16 * S,
                  backgroundImage: `url(${COIN_IMG})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${16 * S}px ${16 * S}px`,
                  imageRendering: "pixelated",
                }}
              />
            </div>
          ))}

          {/* Players */}
          {allPlayers.map((p) => (
            <div
              key={p.id}
              className="absolute transition-transform duration-300"
              style={{
                width: 16 * S,
                height: 16 * S,
                transform: `translate3d(${16 * p.x * S}px, ${(16 * p.y - 4) * S}px, 0)`,
                zIndex: p.isYou ? 100 : p.y,
              }}
            >
              {/* Shadow */}
              <div
                className="absolute"
                style={{
                  width: 16 * S,
                  height: 16 * S,
                  backgroundImage: `url(${SHADOW_IMG})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${16 * S}px ${16 * S}px`,
                  imageRendering: "pixelated",
                }}
              />
              {/* Sprite */}
              <div
                className="absolute overflow-hidden"
                style={{
                  width: 16 * S,
                  height: 16 * S,
                  top: -3 * S,
                  backgroundImage: `url(${CHARACTERS_IMG})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: `${32 * S}px ${96 * S}px`,
                  backgroundPositionX: p.direction === "left" ? -16 * S : 0,
                  backgroundPositionY: (colorYOffsets[p.color] || 0) * S,
                  imageRendering: "pixelated",
                }}
              />
              {/* Name + Coins label */}
              <div
                className="absolute flex items-center whitespace-nowrap rounded-sm"
                style={{
                  top: -12 * S,
                  left: -5 * S,
                  fontSize: 5 * S,
                  padding: `${1 * S}px ${2 * S}px`,
                  background: "#333",
                  color: "#fff",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-inter), sans-serif",
                  lineHeight: 1.2,
                }}
              >
                <span>{p.name}</span>
                <span style={{ marginLeft: 1 * S, color: "gold" }}>{p.coins}</span>
              </div>
              {/* You arrow */}
              {p.isYou && (
                <div
                  className="absolute"
                  style={{
                    top: -18 * S,
                    left: 5 * S,
                    width: 7 * S,
                    height: 5 * S,
                    backgroundImage: `url(${ARROW_IMG})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: `${7 * S}px ${5 * S}px`,
                    imageRendering: "pixelated",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Player Info bar */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <div className="flex flex-1 items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Name</label>
          <Input
            value={playerName}
            onChange={handleNameChange}
            maxLength={10}
            className="h-7 flex-1 border-border bg-secondary/50 text-xs font-bold uppercase text-foreground font-mono"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={cycleColor}
          className="h-7 gap-1 border-border text-xs hover:border-primary/50"
        >
          <Palette className="h-3 w-3" />
          Color
        </Button>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-2 border-t border-border p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">XP Progress</span>
          <span className="font-mono text-foreground">{gameXp.toLocaleString()} XP</span>
        </div>
        <Progress value={xpProgress} className="h-1.5" />
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Karma Multiplier:</span>
            <Badge variant="outline" className={`text-xs font-mono ${
              karmaMultiplier >= 1.1
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : karmaMultiplier < 1.0
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : "border-border text-muted-foreground"
            }`}>
              {karmaMultiplier >= 1.1 ? <TrendingUp className="mr-1 h-3 w-3" /> : karmaMultiplier < 1.0 ? <TrendingDown className="mr-1 h-3 w-3" /> : null}
              {karmaMultiplier}x
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">Arrow Keys / WASD</span>
        </div>
      </div>
    </div>
  )
}
