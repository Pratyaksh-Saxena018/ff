"use client"

import { Star, Target, Gamepad2, Award, ChevronRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { SpriteAvatar } from "@/components/sprite-avatar"
import type { User } from "@/lib/store"

interface ProfilePanelProps {
  user: User
}

const ranks = [
  { name: "Observer", minKarma: 0 },
  { name: "Juror", minKarma: 200 },
  { name: "Senior Juror", minKarma: 600 },
  { name: "Guardian", minKarma: 1000 },
]

export function ProfilePanel({ user }: ProfilePanelProps) {
  const currentRankIdx = ranks.findIndex(r => r.name === user.juryRank)
  const nextRank = ranks[currentRankIdx + 1]
  const prevKarma = ranks[currentRankIdx]?.minKarma || 0
  const nextKarma = nextRank?.minKarma || 1000
  const progressToNext = ((user.karma - prevKarma) / (nextKarma - prevKarma)) * 100

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      {/* User Card */}
      <div className="glass-card neon-border rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <SpriteAvatar color={user.avatarColor || "blue"} size={64} className="ring-2 ring-primary/30" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                <Award className="mr-1 h-3 w-3" />
                {user.juryRank}
              </Badge>
              <Badge variant="outline" className="border-[hsl(var(--neon-amber))/0.3] bg-[hsl(var(--neon-amber))/0.1] text-[hsl(var(--neon-amber))]">
                <Star className="mr-1 h-3 w-3" />
                {user.karma} Karma
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { icon: Star, label: "Karma Score", value: user.karma.toString(), color: "text-[hsl(var(--neon-amber))]" },
          { icon: Target, label: "Jury Accuracy", value: `${user.juryAccuracy}%`, color: "text-primary" },
          { icon: Gamepad2, label: "Game XP", value: user.gameXp.toLocaleString(), color: "text-[hsl(var(--neon-green))]" },
          { icon: Award, label: "Level", value: user.level.toString(), color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-4">
            <stat.icon className={`mb-2 h-5 w-5 ${stat.color}`} />
            <p className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Rank Progression */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Rank Progression</h3>
        <div className="flex flex-col gap-3">
          {/* Rank ladder */}
          <div className="flex items-center justify-between">
            {ranks.map((rank, idx) => (
              <div key={rank.name} className="flex items-center gap-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${
                  idx <= currentRankIdx
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {idx + 1}
                </div>
                <span className={`text-xs font-medium ${
                  idx === currentRankIdx ? "text-primary" : idx < currentRankIdx ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {rank.name}
                </span>
                {idx < ranks.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {nextRank && (
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress to {nextRank.name}</span>
                <span className="font-mono text-primary">{Math.round(progressToNext)}%</span>
              </div>
              <Progress value={progressToNext} className="h-2" />
              <p className="mt-1 text-[10px] text-muted-foreground">
                {nextKarma - user.karma} karma points to next rank
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Behavior Impact */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Behavior Impact on Game</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-[hsl(var(--neon-green))/0.05] p-4 neon-border-green">
            <p className="mb-2 text-xs font-semibold text-[hsl(var(--neon-green))]">High Karma Benefits</p>
            <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-[hsl(var(--neon-green))]" />
                XP Boost +20%
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-[hsl(var(--neon-green))]" />
                Access to Elite Rooms
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-[hsl(var(--neon-green))]" />
                Priority Matchmaking
              </li>
            </ul>
          </div>
          <div className="rounded-xl bg-[hsl(var(--neon-red))/0.05] p-4 neon-border-red">
            <p className="mb-2 text-xs font-semibold text-[hsl(var(--neon-red))]">Low Karma Penalties</p>
            <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-[hsl(var(--neon-red))]" />
                Restricted Rooms
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-[hsl(var(--neon-red))]" />
                Reduced XP Gain
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-[hsl(var(--neon-red))]" />
                Slower Matchmaking
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
