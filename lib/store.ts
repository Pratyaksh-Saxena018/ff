export type User = {
  id: string
  name: string
  email: string
  avatar: string
  avatarColor: string
  karma: number
  juryRank: string
  juryAccuracy: number
  gameXp: number
  level: number
}

export type Message = {
  id: string
  userId: string
  userName: string
  avatar: string
  avatarColor: string
  content: string
  timestamp: Date
  roomId: string
}

export type GroupChat = {
  id: string
  name: string
  description: string
  inviteCode: string
  members: string[]
  createdBy: string
  type: "general" | "victim-safe-space" | "bully-reflection"
  isPrivate: boolean
}

export type Dispute = {
  id: number
  disputeId?: string
  status: "investigating" | "ready" | "resolved"
  harmLevel: number
  remorseProbability: number
  intentClassification: string
  apologyOffered: boolean
  forgiveVotes: number
  sanctionVotes: number
  totalVotes: number
  countdown: number
  bullyUsername?: string
  victimUsername?: string
  bullyId?: string
  victimId?: string
  caseNumber?: string
  contextSummary?: string
}

export type AIAgent = {
  name: string
  role: string
  status: "idle" | "active" | "complete" | "pending"
}

// Mock data generators
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export const mockUser: User = {
  id: "user-1",
  name: "CyberNova",
  email: "cybernova@friendfi.io",
  avatar: "CN",
  avatarColor: "blue",
  karma: 842,
  juryRank: "Senior Juror",
  juryAccuracy: 78,
  gameXp: 12430,
  level: 24,
}

export const mockGroups: GroupChat[] = [
  {
    id: "group-1",
    name: "General Lobby",
    description: "Main chat for all FriendFi users",
    inviteCode: "FRND2024",
    members: ["user-1", "user-2", "user-3", "user-4"],
    createdBy: "system",
    type: "general",
    isPrivate: false,
  },
  {
    id: "group-2",
    name: "Dev Squad",
    description: "Developers and builders community",
    inviteCode: "DEVSQ001",
    members: ["user-1", "user-2"],
    createdBy: "user-1",
    type: "general",
    isPrivate: true,
  },
  {
    id: "group-3",
    name: "Safe Space - Room A",
    description: "A calm, monitored space for affected users. You are safe here.",
    inviteCode: "SAFEA001",
    members: ["user-3"],
    createdBy: "system",
    type: "victim-safe-space",
    isPrivate: true,
  },
  {
    id: "group-4",
    name: "Reflection Room - Room B",
    description: "A space for reflection and accountability. AI is monitoring.",
    inviteCode: "REFLB001",
    members: ["user-4"],
    createdBy: "system",
    type: "bully-reflection",
    isPrivate: true,
  },
  {
    id: "group-5",
    name: "Gaming Hub",
    description: "Coordinate game sessions and strategies",
    inviteCode: "GAME8899",
    members: ["user-1", "user-2", "user-3"],
    createdBy: "user-2",
    type: "general",
    isPrivate: false,
  },
]

export const mockMessages: Message[] = [
  {
    id: "msg-1",
    userId: "user-2",
    userName: "PixelWolf",
    avatar: "PW",
    avatarColor: "red",
    content: "Hey everyone, welcome to FriendFi!",
    timestamp: new Date(Date.now() - 3600000),
    roomId: "group-1",
  },
  {
    id: "msg-2",
    userId: "user-3",
    userName: "NeonFox",
    avatar: "NF",
    avatarColor: "orange",
    content: "This platform is incredible. The AI mediation is next level.",
    timestamp: new Date(Date.now() - 3000000),
    roomId: "group-1",
  },
  {
    id: "msg-3",
    userId: "user-1",
    userName: "CyberNova",
    avatar: "CN",
    avatarColor: "blue",
    content: "Just reached Senior Juror rank! The karma system really works.",
    timestamp: new Date(Date.now() - 2400000),
    roomId: "group-1",
  },
  {
    id: "msg-4",
    userId: "user-4",
    userName: "ShadowByte",
    avatar: "SB",
    avatarColor: "green",
    content: "Anyone up for a game session?",
    timestamp: new Date(Date.now() - 1800000),
    roomId: "group-1",
  },
  {
    id: "msg-5",
    userId: "user-2",
    userName: "PixelWolf",
    avatar: "PW",
    avatarColor: "red",
    content: "The dispute resolution system just handled a case in our group. Impressive.",
    timestamp: new Date(Date.now() - 1200000),
    roomId: "group-1",
  },
  {
    id: "msg-6",
    userId: "user-3",
    userName: "NeonFox",
    avatar: "NF",
    avatarColor: "orange",
    content: "My karma multiplier is at 1.3x now. Game rewards are stacking up.",
    timestamp: new Date(Date.now() - 600000),
    roomId: "group-1",
  },
  // Safe Space messages
  {
    id: "msg-ss-1",
    userId: "system",
    userName: "AI Guardian",
    avatar: "AG",
    avatarColor: "purple",
    content: "Welcome to your Safe Space. This room is monitored by AI for your protection. You are safe here.",
    timestamp: new Date(Date.now() - 500000),
    roomId: "group-3",
  },
  {
    id: "msg-ss-2",
    userId: "user-3",
    userName: "NeonFox",
    avatar: "NF",
    avatarColor: "orange",
    content: "Thank you. I feel much better knowing the situation is being handled.",
    timestamp: new Date(Date.now() - 400000),
    roomId: "group-3",
  },
  // Reflection Room messages
  {
    id: "msg-rr-1",
    userId: "system",
    userName: "AI Sentinel",
    avatar: "AS",
    avatarColor: "yellow",
    content: "You have been placed in the Reflection Room. The AI is reviewing your recent interactions. Please explain your intent.",
    timestamp: new Date(Date.now() - 500000),
    roomId: "group-4",
  },
  {
    id: "msg-rr-2",
    userId: "user-4",
    userName: "ShadowByte",
    avatar: "SB",
    avatarColor: "green",
    content: "I understand. I didn't mean for my words to come across that way.",
    timestamp: new Date(Date.now() - 350000),
    roomId: "group-4",
  },
]

export const mockAIAgents: AIAgent[] = [
  { name: "Sentinel AI", role: "Toxicity Detection", status: "idle" },
  { name: "Mediator AI", role: "Interview Analysis", status: "idle" },
  { name: "Clerk AI", role: "Summary Generation", status: "idle" },
  { name: "Ethic Validator", role: "Bias Check", status: "idle" },
]

export const defaultDispute: Dispute = {
  id: 291,
  status: "investigating",
  harmLevel: 7,
  remorseProbability: 63,
  intentClassification: "Sarcastic but Harmful",
  apologyOffered: true,
  forgiveVotes: 0,
  sanctionVotes: 0,
  totalVotes: 0,
  countdown: 60,
}
