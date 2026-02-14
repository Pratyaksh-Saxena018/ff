"use client"

import { Shield, Zap, Star, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SpriteAvatar } from "@/components/sprite-avatar"
import Link from "next/link"

interface TopNavProps {
  courtMode: boolean
  onSimulateTrigger: () => void
  karma: number
  juryRank: string
  activeTab: string
  onTabChange: (tab: string) => void
}

export function TopNav({ courtMode, onSimulateTrigger, karma, juryRank, activeTab, onTabChange }: TopNavProps) {
  const tabs = ["Chat", "Court", "Profile"]

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm">
      {/* Left: Logo + Status */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 neon-border">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">FriendFi</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${courtMode ? "bg-[hsl(var(--neon-red))] animate-pulse" : "bg-[hsl(var(--neon-green))]"}`} />
          <span className="text-xs text-muted-foreground font-mono">
            {courtMode ? "Court Mode" : "Normal"}
          </span>
        </div>
      </div>

      {/* Center: Tabs */}
      <nav className="hidden items-center gap-1 md:flex">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab.toLowerCase())}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === tab.toLowerCase()
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Right: Karma + Rank + Trigger */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="hidden border-[hsl(var(--neon-amber))/0.3] bg-[hsl(var(--neon-amber))/0.1] text-[hsl(var(--neon-amber))] sm:flex gap-1">
          <Star className="h-3 w-3" />
          {karma}
        </Badge>
        <Badge variant="outline" className="hidden border-primary/30 bg-primary/10 text-primary md:inline-flex">
          {juryRank}
        </Badge>
        <Button
          size="sm"
          onClick={onSimulateTrigger}
          className={`gap-1.5 text-xs font-semibold ${
            courtMode
              ? "bg-[hsl(var(--neon-red))] text-foreground hover:bg-[hsl(var(--neon-red))/0.8]"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{courtMode ? "End Court" : "Simulate Trigger"}</span>
        </Button>
        <SpriteAvatar color="blue" size={28} className="ring-2 ring-primary/30" />
        <Link href="/login">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </header>
  )
}
