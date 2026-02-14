"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { TopNav } from "@/components/top-nav"
import { GroupSidebar } from "@/components/group-sidebar"
import { ChatPanel } from "@/components/chat-panel"
import { GamePanel } from "@/components/game-panel"
import { JusticeDashboard } from "@/components/justice-dashboard"
import { AICouncil } from "@/components/ai-council"
import { ProfilePanel } from "@/components/profile-panel"
import {
  mockAIAgents,
  defaultDispute,
  type GroupChat,
  type Message,
  type AIAgent,
  type Dispute,
  type User,
} from "@/lib/store"
import {
  getStoredToken,
  apiGetProfile,
  apiGetRoomMessages,
  apiGetMyGroups,
  apiCreateGroup,
  apiJoinGroup,
  type ApiMessage,
  type ApiGroup,
} from "@/lib/api"
import { useChatSocket, type MessageSentPayload } from "@/lib/useChatSocket"

function apiMessageToMessage(m: ApiMessage): Message {
  const sender = typeof m.senderId === "object" && m.senderId !== null ? m.senderId : null
  const userId = sender?._id ?? String(m.senderId)
  const userName = sender?.username ?? "Unknown"
  return {
    id: m._id,
    userId,
    userName,
    avatar: (userName.slice(0, 2) || "?").toUpperCase(),
    avatarColor: "blue",
    content: m.message,
    timestamp: new Date(m.createdAt),
    roomId: m.roomId,
  }
}

function payloadToMessage(p: MessageSentPayload): Message {
  return {
    id: p.messageId,
    userId: p.senderId,
    userName: p.senderUsername ?? "Unknown",
    avatar: (p.senderUsername?.slice(0, 2) || "?").toUpperCase(),
    avatarColor: "blue",
    content: p.message,
    timestamp: p.createdAt ? new Date(p.createdAt) : new Date(),
    roomId: p.roomId,
  }
}

function profileToUser(profile: { _id: string; username: string; email: string; karmaScore?: number; juryRank?: string; gameXP?: number }): User {
  return {
    id: profile._id,
    name: profile.username,
    email: profile.email,
    avatar: (profile.username.slice(0, 2) || "?").toUpperCase(),
    avatarColor: "blue",
    karma: profile.karmaScore ?? 500,
    juryRank: profile.juryRank ?? "Observer",
    juryAccuracy: 0,
    gameXp: profile.gameXP ?? 0,
    level: 1,
  }
}

function apiGroupToGroupChat(g: ApiGroup): GroupChat {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    inviteCode: g.inviteCode,
    members: g.members,
    createdBy: g.createdBy,
    type: g.type,
    isPrivate: g.isPrivate,
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("chat")
  const [courtMode, setCourtMode] = useState(false)
  const [groups, setGroups] = useState<GroupChat[]>([])
  const [activeGroupId, setActiveGroupId] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [agents, setAgents] = useState<AIAgent[]>(mockAIAgents)
  const [dispute, setDispute] = useState<Dispute>(defaultDispute)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const prevRoomRef = useRef<string | null>(null)

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null
  const filteredMessages = messages.filter((m) => m.roomId === activeGroupId)

  // Load groups from API when user is set (once)
  const groupsLoadedRef = useRef(false)
  useEffect(() => {
    if (!user || groupsLoadedRef.current) return
    groupsLoadedRef.current = true
    apiGetMyGroups().then((list) => {
      const mapped = list.map(apiGroupToGroupChat)
      setGroups(mapped)
      if (mapped.length > 0) setActiveGroupId((id) => (id ? id : mapped[0].id))
    })
  }, [user])

  // Load profile and redirect if not logged in
  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      router.replace("/login")
      return
    }
    apiGetProfile().then((res) => {
      setLoading(false)
      if (res.success && res.user) setUser(profileToUser(res.user))
    }).catch(() => setLoading(false))
  }, [router])

  // Isolation room ref to avoid re-adding when dispute updates
  const isolationRoomRef = useRef<string | null>(null)

  // Load messages for active room and join socket room
  const { joinRoom, leaveRoom, sendMessage: socketSendMessage, castVote } = useChatSocket({
    enabled: !!user,
    onMessageSent: useCallback((payload: MessageSentPayload) => {
      setMessages((prev) => {
        const dup = prev.find((m) => m.id === payload.messageId)
        if (dup) return prev
        const opt = prev.find(
          (m) =>
            m.id.startsWith("opt-") &&
            m.roomId === payload.roomId &&
            m.userId === payload.senderId &&
            m.content === payload.message
        )
        if (opt) return prev.map((m) => (m.id === opt.id ? payloadToMessage(payload) : m))
        return [...prev, payloadToMessage(payload)]
      })
      if (payload.flagged && payload.roomId === activeGroupId) {
        toast.warning("AI detected concerning content. A case may be opened for review.")
      }
      if (payload.disputeCreated && payload.roomId === activeGroupId) {
        setCourtMode(true)
        setActiveTab("court")
        setDispute((d) => ({ ...d, status: "investigating" }))
        toast.error("AI intervention: A dispute has been opened. Court mode activated.")
      }
    }, [activeGroupId]),
    onDisputeCreated: useCallback((p) => {
      setCourtMode(true)
      setActiveTab("court")
      const d = p.dispute
      setDispute((prev) => ({
        ...prev,
        status: "investigating",
        disputeId: d.disputeId ?? d._id,
        caseNumber: d.caseNumber,
        bullyUsername: d.bullyUsername,
        victimUsername: d.victimUsername,
        bullyId: d.bullyId,
        victimId: d.victimId,
        harmLevel: d.harmLevel ?? 0,
        remorseProbability: d.remorseScore ?? 0,
        intentClassification: d.aiSummary?.intentClassification ?? prev.intentClassification,
        apologyOffered: d.apologyOffered ?? false,
      }))
      toast.error(`Dispute created: ${d.bullyUsername ?? "Accused"} vs ${d.victimUsername ?? "Affected"}. Mediation in progress.`)
    }, []),
    onCourtModeActivated: useCallback((p) => {
      setCourtMode(true)
      setActiveTab("court")
      setDispute((prev) => ({
        ...prev,
        status: "investigating",
        disputeId: p.disputeId,
        caseNumber: p.caseNumber,
        bullyUsername: p.bullyUsername,
        victimUsername: p.victimUsername,
        bullyId: p.bullyId,
        victimId: p.victimId,
      }))
      toast(`Court mode: Case ${p.caseNumber ?? p.disputeId}. Accused: ${p.bullyUsername ?? "—"}. Affected: ${p.victimUsername ?? "—"}`)
    }, []),
    onUserIsolated: useCallback((p) => {
      if (p.role === "bully") {
        toast.error("You have been moved to the Reflection Room. Explain your intent.")
      } else if (p.role === "victim") {
        toast.success("You have been moved to a Safe Space. You are safe here.")
      }
      const roomId = p.room
      if (!roomId || isolationRoomRef.current === roomId) return
      isolationRoomRef.current = roomId
      const isBully = p.role === "bully"
      const virtualGroup: GroupChat = {
        id: roomId,
        name: isBully ? "Reflection Room" : "Safe Space",
        description: isBully
          ? "A space for reflection and accountability. Explain your intent. AI is monitoring."
          : "A calm space for you. You are safe here.",
        inviteCode: p.caseNumber ?? "—",
        members: [user?.id ?? ""],
        createdBy: "system",
        type: isBully ? "bully-reflection" : "victim-safe-space",
        isPrivate: true,
      }
      setGroups((prev) => {
        if (prev.some((g) => g.id === roomId)) return prev
        return [...prev, virtualGroup]
      })
      setActiveGroupId(roomId)
      setCourtMode(true)
      setActiveTab("court")
      setDispute((prev) => ({
        ...prev,
        disputeId: p.disputeId,
        caseNumber: p.caseNumber,
        bullyUsername: p.bullyUsername ?? prev.bullyUsername,
        victimUsername: p.victimUsername ?? prev.victimUsername,
      }))
    }, [user?.id]),
    onCaseReady: useCallback((p) => {
      setDispute((prev) => {
        if (prev.disputeId !== p.disputeId) return prev
        return { ...prev, status: "ready", countdown: 60 }
      })
      setAgents((prev) => prev.map((a) => ({ ...a, status: "complete" })))
      toast("Case file is ready. Cast your vote.")
    }, []),
    onVoteCast: useCallback((p) => {
      setDispute((prev) => {
        if (prev.disputeId !== p.disputeId) return prev
        const f = prev.forgiveVotes + (p.vote === "FORGIVE" ? 1 : 0)
        const s = prev.sanctionVotes + (p.vote === "SANCTION" ? 1 : 0)
        return { ...prev, forgiveVotes: f, sanctionVotes: s, totalVotes: prev.totalVotes + 1 }
      })
    }, []),
    onVerdictAnnounced: useCallback((p) => {
      setDispute((prev) => {
        if (prev.disputeId !== p.disputeId) return prev
        return { ...prev, status: "resolved", countdown: 0 }
      })
      setCourtMode(false)
      toast(`Verdict: ${p.verdict ?? "closed"}`)
      isolationRoomRef.current = null
    }, []),
  })

  useEffect(() => {
    if (!user || !activeGroupId) return
    if (prevRoomRef.current && prevRoomRef.current !== activeGroupId) {
      leaveRoom(prevRoomRef.current)
    }
    prevRoomRef.current = activeGroupId
    joinRoom(activeGroupId)
  }, [activeGroupId, user, joinRoom, leaveRoom])

  useEffect(() => {
    if (!user || !activeGroupId) return
    apiGetRoomMessages(activeGroupId).then((list) => {
      const fromApi = list.map(apiMessageToMessage)
      setMessages((prev) => [
        ...prev.filter((m) => m.roomId !== activeGroupId),
        ...fromApi,
      ])
    })
  }, [activeGroupId, user])

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!user) return
      const optimistic: Message = {
        id: `opt-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        avatar: user.avatar,
        avatarColor: user.avatarColor,
        content,
        timestamp: new Date(),
        roomId: activeGroupId,
      }
      setMessages((prev) => [...prev, optimistic])
      const ok = await socketSendMessage(activeGroupId, content)
      if (!ok) {
        toast.error("Failed to send. Check connection.")
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      }
    },
    [activeGroupId, user, socketSendMessage]
  )

  const handleCreateGroup = useCallback(
    async (group: GroupChat) => {
      const res = await apiCreateGroup({
        name: group.name,
        description: group.description,
        type: group.type,
        isPrivate: group.isPrivate,
      })
      if (res.success && res.group) {
        setGroups((prev) => [...prev, apiGroupToGroupChat(res.group!)])
        setActiveGroupId(res.group.id)
        toast.success(`Group "${res.group.name}" created! Invite code: ${res.group.inviteCode}`)
      } else {
        toast.error(res.error ?? "Failed to create group")
      }
    },
    []
  )

  const handleJoinGroup = useCallback(
    async (code: string): Promise<boolean> => {
      const res = await apiJoinGroup(code)
      if (res.success && res.group) {
        const g = res.group
        setGroups((prev) => {
          const existing = prev.find((x) => x.id === g.id)
          if (existing) return prev.map((x) => (x.id === g.id ? apiGroupToGroupChat(g) : x))
          return [...prev, apiGroupToGroupChat(g)]
        })
        setActiveGroupId(g.id)
        toast.success(`Joined "${g.name}" successfully!`)
        return true
      }
      toast.error(res.error ?? "Invalid invite code")
      return false
    },
    []
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

    // Phase 3: case ready (simulate - no real disputeId, votes are local only)
    setTimeout(() => {
      setAgents((prev) => prev.map((a) => ({ ...a, status: "complete" })))
      setDispute({
        ...defaultDispute,
        status: "ready",
        forgiveVotes: 12,
        sanctionVotes: 8,
        totalVotes: 20,
        bullyUsername: "User A",
        victimUsername: "User B",
      })
      toast("Case file is ready. Cast your vote (simulation).")
    }, 3000)
  }, [courtMode])

  const handleVote = useCallback(
    async (vote: "forgive" | "sanction") => {
      const disputeId = dispute.disputeId
      if (disputeId) {
        const ok = await castVote(disputeId, vote === "forgive" ? "FORGIVE" : "SANCTION")
        if (ok) {
          setDispute((prev) => ({
            ...prev,
            forgiveVotes: prev.forgiveVotes + (vote === "forgive" ? 1 : 0),
            sanctionVotes: prev.sanctionVotes + (vote === "sanction" ? 1 : 0),
            totalVotes: prev.totalVotes + 1,
          }))
          toast.success(`Vote recorded: ${vote === "forgive" ? "Forgive" : "Sanction"}`)
        } else {
          toast.error("Failed to cast vote. You may have already voted.")
        }
      } else {
        setDispute((prev) => ({
          ...prev,
          forgiveVotes: prev.forgiveVotes + (vote === "forgive" ? 1 : 0),
          sanctionVotes: prev.sanctionVotes + (vote === "sanction" ? 1 : 0),
          totalVotes: prev.totalVotes + 1,
        }))
        toast.success(`Vote recorded: ${vote === "forgive" ? "Forgive" : "Sanction"}`)
      }
    },
    [dispute.disputeId, castVote]
  )

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

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
                  currentUserId={user.id}
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
                  currentUserId={user.id}
                />
              </div>
              <div className="w-80 shrink-0">
                <JusticeDashboard
                  dispute={dispute}
                  agents={agents}
                  onVote={handleVote}
                  courtMode={courtMode}
                  currentUserId={user.id}
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
