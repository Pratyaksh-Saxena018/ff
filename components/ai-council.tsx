"use client"

import { useState } from "react"
import { Bot, ChevronUp, ChevronDown, Loader2, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AIAgent } from "@/lib/store"

interface AICouncilProps {
  agents: AIAgent[]
}

export function AICouncil({ agents }: AICouncilProps) {
  const [expanded, setExpanded] = useState(false)

  const activeCount = agents.filter(a => a.status === "active").length

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`glass-card neon-border rounded-xl overflow-hidden transition-all ${expanded ? "w-72" : "w-auto"}`}>
        {/* Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
        >
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">AI Council</span>
            {activeCount > 0 && (
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px] font-mono animate-pulse">
                {activeCount} active
              </Badge>
            )}
          </div>
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>

        {/* Agent List */}
        {expanded && (
          <div className="border-t border-border px-3 pb-3 pt-2">
            <div className="flex flex-col gap-2">
              {agents.map((agent) => (
                <div key={agent.name} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">{agent.name}</span>
                    <span className="text-[10px] text-muted-foreground">{agent.role}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {agent.status === "active" && (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    )}
                    {agent.status === "complete" && (
                      <CheckCircle2 className="h-3 w-3 text-[hsl(var(--neon-green))]" />
                    )}
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      agent.status === "active" ? "bg-primary animate-pulse" :
                      agent.status === "complete" ? "bg-[hsl(var(--neon-green))]" :
                      agent.status === "pending" ? "bg-[hsl(var(--neon-amber))]" :
                      "bg-muted-foreground/30"
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
