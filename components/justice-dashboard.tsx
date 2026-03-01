"use client"

import { useEffect, useState } from "react"
import { Scale, CheckCircle2, Loader2, Clock, ShieldAlert, HeartHandshake, Gavel } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { Dispute, AIAgent } from "@/lib/store"

interface JusticeDashboardProps {
  dispute: Dispute
  agents: AIAgent[]
  onVote: (vote: "forgive" | "sanction") => void
  courtMode: boolean
  currentUserId?: string
}

export function JusticeDashboard({ dispute, agents, onVote, courtMode, currentUserId }: JusticeDashboardProps) {
  const [countdown, setCountdown] = useState(dispute.countdown)
  const [hasVoted, setHasVoted] = useState(false)

  useEffect(() => {
    setCountdown(dispute.countdown)
    setHasVoted(false)
  }, [dispute.countdown])

  useEffect(() => {
    if (!courtMode || dispute.status !== "ready" || countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [courtMode, dispute.status, countdown])

  function handleVote(vote: "forgive" | "sanction") {
    setHasVoted(true)
    onVote(vote)
  }

  if (!courtMode) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl glass-card p-6 text-center">
        <Scale className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <h3 className="text-sm font-semibold text-muted-foreground">Justice Dashboard</h3>
        <p className="mt-1 text-xs text-muted-foreground/70">
          No active disputes. The community is at peace.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-xl glass-card neon-border-red overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Scale className="h-4 w-4 text-[hsl(var(--neon-red))]" />
        <h3 className="text-sm font-semibold text-foreground">Active Dispute</h3>
        <Badge variant="outline" className="ml-auto border-[hsl(var(--neon-red))/0.3] text-[hsl(var(--neon-red))] text-[10px] font-mono">
          {dispute.caseNumber ?? `#${dispute.id}`}
        </Badge>
      </div>

      {/* Victim & Bully Identification */}
      {(dispute.bullyUsername || dispute.victimUsername) && (
        <div className="border-b border-border px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parties</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-lg bg-[hsl(var(--neon-red))/0.1] px-3 py-2">
              <span className="text-xs text-muted-foreground">Accused (Bully)</span>
              <span className="text-xs font-medium text-[hsl(var(--neon-red))]">
                {currentUserId && dispute.bullyId === currentUserId
                  ? "You"
                  : dispute.bullyUsername ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[hsl(var(--neon-green))/0.1] px-3 py-2">
              <span className="text-xs text-muted-foreground">Affected (Victim)</span>
              <span className="text-xs font-medium text-[hsl(var(--neon-green))]">
                {currentUserId && dispute.victimId === currentUserId
                  ? "You"
                  : dispute.victimUsername ?? "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* AI Agent Status */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Council Status</p>
          <div className="flex flex-col gap-2">
            {agents.map((agent) => (
              <div key={agent.name} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{agent.name}</span>
                </div>
                <Badge variant="outline" className={`text-[10px] font-mono ${
                  agent.status === "complete"
                    ? "border-[hsl(var(--neon-green))/0.3] text-[hsl(var(--neon-green))]"
                    : agent.status === "active"
                      ? "border-primary/30 text-primary animate-pulse"
                      : "border-border text-muted-foreground"
                }`}>
                  {agent.status === "active" && <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />}
                  {agent.status === "complete" && <CheckCircle2 className="mr-1 h-2.5 w-2.5" />}
                  {agent.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* AI Summary (Court Room) */}
        {dispute.status === "ready" && dispute.contextSummary && (
          <div className="rounded-lg border border-[hsl(var(--neon-amber))/0.3] bg-[hsl(var(--neon-amber))/0.05 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--neon-amber))]">AI Summary</p>
            <p className="text-xs text-foreground/90 whitespace-pre-wrap">{dispute.contextSummary}</p>
          </div>
        )}

        {/* Case File */}
        {dispute.status === "ready" && (
          <div className="rounded-lg border border-border bg-secondary/20 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Case File</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Intent</span>
                <span className="text-xs font-medium text-foreground">{dispute.intentClassification}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Harm Level</span>
                <div className="flex items-center gap-2">
                  <Progress value={dispute.harmLevel * 10} className="h-1.5 w-16" />
                  <span className="text-xs font-mono text-[hsl(var(--neon-red))]">{dispute.harmLevel}/10</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Remorse</span>
                <span className="text-xs font-mono text-[hsl(var(--neon-amber))]">{dispute.remorseProbability}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Apology</span>
                <Badge variant="outline" className={`text-[10px] ${
                  dispute.apologyOffered
                    ? "border-[hsl(var(--neon-green))/0.3] text-[hsl(var(--neon-green))]"
                    : "border-[hsl(var(--neon-red))/0.3] text-[hsl(var(--neon-red))]"
                }`}>
                  {dispute.apologyOffered ? "Offered" : "None"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Voting */}
        {dispute.status === "ready" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cast Your Vote</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{countdown}s</span>
              </div>
            </div>

            {hasVoted ? (
              <div className="rounded-lg bg-primary/10 p-3 text-center neon-border">
                <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-primary" />
                <p className="text-xs font-medium text-foreground">Vote recorded</p>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleVote("forgive")}
                  className="flex-1 gap-1.5 bg-[hsl(var(--neon-green))] text-background hover:bg-[hsl(var(--neon-green))/0.8] text-xs font-semibold"
                  disabled={countdown === 0}
                >
                  <HeartHandshake className="h-3.5 w-3.5" />
                  Forgive
                </Button>
                <Button
                  onClick={() => handleVote("sanction")}
                  className="flex-1 gap-1.5 bg-[hsl(var(--neon-red))] text-foreground hover:bg-[hsl(var(--neon-red))/0.8] text-xs font-semibold"
                  disabled={countdown === 0}
                >
                  <Gavel className="h-3.5 w-3.5" />
                  Sanction
                </Button>
              </div>
            )}

            {/* Vote Progress */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Forgive: {dispute.forgiveVotes}</span>
                <span>Sanction: {dispute.sanctionVotes}</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                {dispute.totalVotes > 0 && (
                  <>
                    <div
                      className="bg-[hsl(var(--neon-green))] transition-all"
                      style={{ width: `${(dispute.forgiveVotes / dispute.totalVotes) * 100}%` }}
                    />
                    <div
                      className="bg-[hsl(var(--neon-red))] transition-all"
                      style={{ width: `${(dispute.sanctionVotes / dispute.totalVotes) * 100}%` }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Investigating State */}
        {dispute.status === "investigating" && (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-secondary/20 p-4 text-center">
            <ShieldAlert className="h-6 w-6 text-primary animate-pulse" />
            <p className="text-xs font-medium text-foreground">AI Interviewing Disputants...</p>
            <p className="text-[10px] text-muted-foreground">Case file will be ready shortly</p>
          </div>
        )}
      </div>
    </div>
  )
}
