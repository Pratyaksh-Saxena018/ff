/**
 * FriendFi API client – base URL and auth helpers.
 * Set NEXT_PUBLIC_API_URL in .env.local (e.g. http://localhost:4000) or it defaults to localhost:4000.
 */
const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return (process.env.NEXT_PUBLIC_API_URL ?? "").trim() || "http://localhost:4000"
  }
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").trim()
}

export const getApiUrl = (path: string): string => {
  const base = getBaseUrl().replace(/\/$/, "")
  const p = path.startsWith("/") ? path : `/${path}`
  return `${base}${p}`
}

export const AUTH_TOKEN_KEY = "friendfi_token"

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export interface LoginResponse {
  success: boolean
  user?: { _id: string; username: string; email: string; karmaScore?: number; juryRank?: string }
  token?: string
  error?: string
}

export interface SignUpResponse {
  success: boolean
  user?: { _id: string; username: string; email: string; karmaScore?: number; juryRank?: string }
  token?: string
  error?: string
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(getApiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { success: false, error: (data as { error?: string }).error ?? "Login failed" }
  }
  return data as LoginResponse
}

export async function apiSignUp(username: string, email: string, password: string): Promise<SignUpResponse> {
  const res = await fetch(getApiUrl("/api/auth/signup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { success: false, error: (data as { error?: string }).error ?? "Sign up failed" }
  }
  return data as SignUpResponse
}

export interface ProfileUser {
  _id: string
  username: string
  email: string
  karmaScore?: number
  juryRank?: string
  gameXP?: number
}

export async function apiGetProfile(): Promise<{ success: boolean; user?: ProfileUser; error?: string }> {
  const token = getStoredToken()
  if (!token) return { success: false, error: "Not authenticated" }
  const res = await fetch(getApiUrl("/api/auth/profile"), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { success: false, error: (data as { error?: string }).error ?? "Failed to load profile" }
  return data as { success: boolean; user?: ProfileUser; error?: string }
}

/** Same origin as API (e.g. http://localhost:4000) for Socket.io */
export function getSocketIoUrl(): string {
  return getBaseUrl().replace(/\/$/, "")
}

export interface ApiMessage {
  _id: string
  roomId: string
  senderId: { _id: string; username?: string } | string
  message: string
  toxicityScore?: number | null
  flagged?: boolean
  createdAt: string
}

export async function apiGetRoomMessages(roomId: string): Promise<ApiMessage[]> {
  const token = getStoredToken()
  if (!token) return []
  const res = await fetch(getApiUrl(`/api/messages/room/${encodeURIComponent(roomId)}`), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return []
  const list = (data as { messages?: ApiMessage[] }).messages ?? []
  return list
}

export interface ApiGroup {
  id: string
  name: string
  description: string
  inviteCode: string
  members: string[]
  createdBy: string
  type: "general" | "victim-safe-space" | "bully-reflection"
  isPrivate: boolean
}

export async function apiGetMyGroups(): Promise<ApiGroup[]> {
  const token = getStoredToken()
  if (!token) return []
  const res = await fetch(getApiUrl("/api/groups"), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return []
  return (data as { groups?: ApiGroup[] }).groups ?? []
}

export async function apiCreateGroup(params: {
  name: string
  description?: string
  type?: ApiGroup["type"]
  isPrivate?: boolean
}): Promise<{ success: boolean; group?: ApiGroup; error?: string }> {
  const token = getStoredToken()
  if (!token) return { success: false, error: "Not authenticated" }
  const res = await fetch(getApiUrl("/api/groups"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: params.name,
      description: params.description ?? "",
      type: params.type ?? "general",
      isPrivate: params.isPrivate ?? true,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { success: false, error: (data as { error?: string }).error ?? "Failed to create group" }
  return data as { success: boolean; group?: ApiGroup; error?: string }
}

export async function apiJoinGroup(inviteCode: string): Promise<{ success: boolean; group?: ApiGroup; error?: string }> {
  const token = getStoredToken()
  if (!token) return { success: false, error: "Not authenticated" }
  const res = await fetch(getApiUrl("/api/groups/join"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { success: false, error: (data as { error?: string }).error ?? "Invalid invite code" }
  return data as { success: boolean; group?: ApiGroup; error?: string }
}
