"use client"

import { useState, useRef, useEffect } from "react"
import { Send, AlertTriangle, ShieldCheck, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SpriteAvatar } from "@/components/sprite-avatar"
import type { Message, GroupChat } from "@/lib/store"

interface ChatPanelProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  courtMode: boolean
  activeGroup: GroupChat | null
}

export function ChatPanel({ messages, onSendMessage, courtMode, activeGroup }: ChatPanelProps) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    onSendMessage(input.trim())
    setInput("")
  }

  const isVictimRoom = activeGroup?.type === "victim-safe-space"
  const isBullyRoom = activeGroup?.type === "bully-reflection"

  const borderClass = courtMode
    ? "neon-border-red"
    : isVictimRoom
      ? "neon-border-green"
      : isBullyRoom
        ? "neon-border-red"
        : ""

  return (
    <div className={`flex h-full flex-col rounded-xl glass-card ${borderClass}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          {isVictimRoom ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--neon-green))/0.15]">
              <ShieldCheck className="h-4 w-4 text-[hsl(var(--neon-green))]" />
            </div>
          ) : isBullyRoom ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--neon-red))/0.15]">
              <Flame className="h-4 w-4 text-[hsl(var(--neon-red))]" />
            </div>
          ) : null}
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {activeGroup?.name || "General Lobby"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {activeGroup?.members.length || 0} members
            </p>
          </div>
        </div>
        {courtMode && !isVictimRoom && !isBullyRoom && (
          <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--neon-red))/0.1] px-3 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--neon-red))]" />
            <span className="text-xs font-medium text-[hsl(var(--neon-red))]">
              Active Dispute #291
            </span>
          </div>
        )}
      </div>

      {/* Room-specific banners */}
      {isVictimRoom && (
        <div className="mx-4 mt-3 rounded-lg bg-[hsl(var(--neon-green))/0.08] px-4 py-3 neon-border-green">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[hsl(var(--neon-green))]" />
            <span className="text-sm font-medium text-[hsl(var(--neon-green))]">Safe Space</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            You are safe. The aggressor has been isolated. AI Guardian is monitoring this room.
          </p>
        </div>
      )}
      {isBullyRoom && (
        <div className="mx-4 mt-3 rounded-lg bg-[hsl(var(--neon-red))/0.08] px-4 py-3 neon-border-red">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[hsl(var(--neon-red))]" />
            <span className="text-sm font-medium text-[hsl(var(--neon-red))]">Reflection Room</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            You have been flagged. The AI is listening. Explain your intent honestly.
          </p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        <div className="flex flex-col gap-4">
          {messages.map((msg) => {
            const isSystem = msg.userId === "system"
            const isMe = msg.userId === "user-1"
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                <SpriteAvatar
                  color={msg.avatarColor || "blue"}
                  size={32}
                  className={`shrink-0 ${isSystem ? "ring-2 ring-primary/40" : ""}`}
                />
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`text-xs font-semibold ${isSystem ? "text-primary" : "text-foreground"}`}>
                      {msg.userName}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div
                    className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                      isMe
                        ? "bg-primary/15 text-foreground"
                        : isSystem
                          ? "bg-primary/10 text-foreground neon-border"
                          : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isVictimRoom
              ? "You are safe here. Share how you feel..."
              : isBullyRoom
                ? "Explain your intent..."
                : "Type a message..."
          }
          className="h-10 flex-1 border-border bg-secondary/30 text-foreground placeholder:text-muted-foreground focus:border-primary"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!input.trim()}
          className="h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
