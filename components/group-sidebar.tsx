"use client"

import { useState } from "react"
import { Plus, Hash, ShieldCheck, Flame, Copy, Check, Users, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { GroupChat } from "@/lib/store"
import { generateInviteCode } from "@/lib/store"

interface GroupSidebarProps {
  groups: GroupChat[]
  activeGroupId: string
  onSelectGroup: (id: string) => void
  onCreateGroup: (group: GroupChat) => void
  onJoinGroup: (code: string) => boolean
}

export function GroupSidebar({ groups, activeGroupId, onSelectGroup, onCreateGroup, onJoinGroup }: GroupSidebarProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [joinError, setJoinError] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const newGroup: GroupChat = {
      id: `group-${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim(),
      inviteCode: generateInviteCode(),
      members: ["user-1"],
      createdBy: "user-1",
      type: "general",
      isPrivate: true,
    }
    onCreateGroup(newGroup)
    setNewName("")
    setNewDesc("")
    setCreateOpen(false)
  }

  function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault()
    setJoinError("")
    if (!joinCode.trim()) return
    const success = onJoinGroup(joinCode.trim().toUpperCase())
    if (success) {
      setJoinCode("")
      setJoinOpen(false)
    } else {
      setJoinError("Invalid invite code. Please check and try again.")
    }
  }

  function copyInviteCode(code: string, groupId: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(groupId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function getGroupIcon(type: GroupChat["type"]) {
    switch (type) {
      case "victim-safe-space":
        return <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--neon-green))]" />
      case "bully-reflection":
        return <Flame className="h-3.5 w-3.5 text-[hsl(var(--neon-red))]" />
      default:
        return <Hash className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  function getGroupBorderClass(type: GroupChat["type"]) {
    switch (type) {
      case "victim-safe-space": return "border-l-[hsl(var(--neon-green))]"
      case "bully-reflection": return "border-l-[hsl(var(--neon-red))]"
      default: return "border-l-transparent"
    }
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Groups</h3>
        </div>
        <div className="flex items-center gap-1">
          {/* Join Group */}
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary">
                <Link2 className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border bg-card text-foreground sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Join a Group</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleJoinGroup} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-foreground">Invite Code</Label>
                  <Input
                    value={joinCode}
                    onChange={(e) => { setJoinCode(e.target.value); setJoinError("") }}
                    placeholder="Enter invite code (e.g., FRND2024)"
                    className="h-11 border-border bg-secondary/50 font-mono uppercase text-foreground placeholder:text-muted-foreground focus:border-primary"
                    maxLength={12}
                  />
                  {joinError && (
                    <p className="text-xs text-[hsl(var(--neon-red))]">{joinError}</p>
                  )}
                </div>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Join Group
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Create Group */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border bg-card text-foreground sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create a Group</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-foreground">Group Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="My Awesome Group"
                    className="h-11 border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:border-primary"
                    maxLength={30}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm text-foreground">Description</Label>
                  <Textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="What is this group about?"
                    className="border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:border-primary resize-none"
                    rows={3}
                  />
                </div>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Create Group
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Group List */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {groups.map((group) => (
            <div
              key={group.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectGroup(group.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectGroup(group.id) }}
              className={`group flex w-full cursor-pointer items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left transition-all ${
                getGroupBorderClass(group.type)
              } ${
                activeGroupId === group.id
                  ? "bg-secondary/80 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              }`}
            >
              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                {getGroupIcon(group.type)}
                <span className="truncate text-sm font-medium">{group.name}</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); copyInviteCode(group.inviteCode, group.id) }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="Copy invite code"
                >
                  {copiedId === group.id ? (
                    <Check className="h-3 w-3 text-[hsl(var(--neon-green))]" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
              {group.type !== "general" && (
                <Badge variant="outline" className={`shrink-0 text-[9px] px-1.5 py-0 ${
                  group.type === "victim-safe-space"
                    ? "border-[hsl(var(--neon-green))/0.3] text-[hsl(var(--neon-green))]"
                    : "border-[hsl(var(--neon-red))/0.3] text-[hsl(var(--neon-red))]"
                }`}>
                  {group.type === "victim-safe-space" ? "Safe" : "Reflect"}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Invite Code Display */}
      <div className="border-t border-border p-3">
        <div className="rounded-lg bg-secondary/30 p-2.5">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Active Group Code</p>
          <div className="flex items-center justify-between">
            <code className="font-mono text-sm font-bold text-primary">
              {groups.find(g => g.id === activeGroupId)?.inviteCode || "---"}
            </code>
            <button
              onClick={() => {
                const code = groups.find(g => g.id === activeGroupId)?.inviteCode
                if (code) copyInviteCode(code, activeGroupId)
              }}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {copiedId === activeGroupId ? (
                <Check className="h-3.5 w-3.5 text-[hsl(var(--neon-green))]" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
