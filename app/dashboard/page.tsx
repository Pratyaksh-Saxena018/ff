"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { TopNav } from "@/components/top-nav"
import { GroupSidebar } from "@/components/group-sidebar"
import { ChatPanel } from "@/components/chat-panel"
import { GamePanel } from "@/components/game-panel"
import { JusticeDashboard } from "@/components/justice-dashboard"
import { AICouncil } from "@/components/ai-council"
import { ProfilePanel } from "@/components/profile-panel"
import {
  mockUser,
  mockGroups,
  mockMessages,
  mockAIAgents,
  defaultDispute,
  type GroupChat,
  type Message,
  type AIAgent,
  type Dispute,
} from "@/lib/store"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("chat")
  const [courtMode, setCourtMode] = useState(false)
  const [groups, setGroups] = useState<GroupChat[]>(mockGroups)
  const [activeGroupId, setActiveGroupId] = useState("group-1")
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [agents, setAgents] = useState<AIAgent[]>(mockAIAgents)
  const [dispute, setDispute] = useState<Dispute>(defaultDispute)
  const [user] = useState(mockUser)

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null
  const filteredMessages = messages.filter((m) => m.roomId === activeGroupId)

  const handleSendMessage = useCallback(
    (content: string) => {
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        userId: "user-1",
        userName: user.name,
        avatar: user.avatar,
        avatarColor: user.avatarColor,
        content,
        timestamp: new Date(),
        roomId: activeGroupId,
      }
      setMessages((prev) => [...prev, newMsg])
    },
    [activeGroupId, user]
  )

  const handleCreateGroup = useCallback((group: GroupChat) => {
    setGroups((prev) => [...prev, group])
    setActiveGroupId(group.id)
    toast.success(`Group "${group.name}" created! Invite code: ${group.inviteCode}`)
  }, [])

  const handleJoinGroup = useCallback(
    (code: string) => {
      const group = groups.find((g) => g.inviteCode === code)
      if (group) {
        if (!group.members.includes("user-1")) {
          setGroups((prev) =>
            prev.map((g) =>
              g.id === group.id ? { ...g, members: [...g.members, "user-1"] } : g
            )
          )
        }
        setActiveGroupId(group.id)
        toast.success(`Joined "${group.name}" successfully!`)
        return true
      }
      return false
    },
    [groups]
  )

  const handleSimulateTrigger = useCallback(() => {
    if (courtMode) {
      // End court mode
      setCourtMode(false)
      setAgents(mockAIAgents.map((a) => ({ ...a, status: "idle" })))
      setDispute({ ...defaultDispute, status: "investigating" })
      toast("Court Mode deactivated. Returning to normal operations.")
      return
    }

    setCourtMode(true)
    toast.error("User A and User B moved to Mediation.")
    setActiveTab("chat")

    // Phase 1: investigating
    setDispute({ ...defaultDispute, status: "investigating" })
    setAgents((prev) =>
      prev.map((a, i) => ({
        ...a,
        status: i === 0 ? "active" : "pending",
      }))
    )

    // Phase 2: agents progress
    setTimeout(() => {
      setAgents((prev) =>
        prev.map((a, i) => ({
          ...a,
          status: i === 0 ? "complete" : i === 1 ? "active" : "pending",
        }))
      )
    }, 1000)

    setTimeout(() => {
      setAgents((prev) =>
        prev.map((a, i) => ({
          ...a,
          status: i <= 1 ? "complete" : i === 2 ? "active" : "pending",
        }))
      )
    }, 2000)

    setTimeout(() => {
      setAgents((prev) =>
        prev.map((a, i) => ({
          ...a,
          status: i <= 2 ? "complete" : "active",
        }))
      )
    }, 2500)

    // Phase 3: case ready
    setTimeout(() => {
      setAgents((prev) => prev.map((a) => ({ ...a, status: "complete" })))
      setDispute({
        ...defaultDispute,
        status: "ready",
        forgiveVotes: 12,
        sanctionVotes: 8,
        totalVotes: 20,
      })
      toast("Case file is ready. Cast your vote.")
    }, 3000)
  }, [courtMode])

  const handleVote = useCallback((vote: "forgive" | "sanction") => {
    setDispute((prev) => ({
      ...prev,
      forgiveVotes: prev.forgiveVotes + (vote === "forgive" ? 1 : 0),
      sanctionVotes: prev.sanctionVotes + (vote === "sanction" ? 1 : 0),
      totalVotes: prev.totalVotes + 1,
    }))
    toast.success(`Vote recorded: ${vote === "forgive" ? "Forgive" : "Sanction"}`)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopNav
        courtMode={courtMode}
        onSimulateTrigger={handleSimulateTrigger}
        karma={user.karma}
        juryRank={user.juryRank}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Group Sidebar */}
        {(activeTab === "chat" || activeTab === "court") && (
          <GroupSidebar
            groups={groups}
            activeGroupId={activeGroupId}
            onSelectGroup={setActiveGroupId}
            onCreateGroup={handleCreateGroup}
            onJoinGroup={handleJoinGroup}
          />
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {activeTab === "chat" && (
            <div className="flex flex-1 gap-3 p-3 overflow-hidden">
              {/* Game Panel - Left side */}
              <div className="flex min-w-0 flex-1 flex-col">
                <GamePanel karma={user.karma} level={user.level} gameXp={user.gameXp} />
              </div>

              {/* Chat Panel - Right side */}
              <div className="flex min-w-0 flex-1 flex-col">
                <ChatPanel
                  messages={filteredMessages}
                  onSendMessage={handleSendMessage}
                  courtMode={courtMode}
                  activeGroup={activeGroup}
                />
              </div>
            </div>
          )}

          {activeTab === "court" && (
            <div className="flex flex-1 gap-3 p-3 overflow-hidden">
              <div className="hidden min-w-0 flex-1 flex-col md:flex">
                <GamePanel karma={user.karma} level={user.level} gameXp={user.gameXp} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <ChatPanel
                  messages={filteredMessages}
                  onSendMessage={handleSendMessage}
                  courtMode={courtMode}
                  activeGroup={activeGroup}
                />
              </div>
              <div className="w-80 shrink-0">
                <JusticeDashboard
                  dispute={dispute}
                  agents={agents}
                  onVote={handleVote}
                  courtMode={courtMode}
                />
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="flex-1 overflow-y-auto">
              <ProfilePanel user={user} />
            </div>
          )}
        </div>
      </div>

      {/* AI Council - Floating */}
      <AICouncil agents={agents} />
    </div>
  )
}
