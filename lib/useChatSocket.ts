"use client"

import { useEffect, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { getStoredToken, getSocketIoUrl } from "./api"

export interface MessageSentPayload {
  messageId: string
  roomId: string
  senderId: string
  senderUsername?: string
  message: string
  createdAt?: string
  toxicityScore?: number | null
  flagged?: boolean
  disputeCreated?: boolean
  humanReview?: boolean
}

export interface DisputeCreatedPayload {
  dispute: {
    _id: string
    disputeId?: string
    caseNumber?: string
    status?: string
    bullyId?: string
    victimId?: string
    bullyUsername?: string
    victimUsername?: string
    harmLevel?: number
    remorseScore?: number
    apologyOffered?: boolean
    aiSummary?: { intentClassification?: string }
  }
}

export interface CourtModePayload {
  disputeId: string
  caseNumber?: string
  bullyUsername?: string
  victimUsername?: string
  bullyId?: string
  victimId?: string
}

export interface UserIsolatedPayload {
  room: string
  role: "bully" | "victim"
  disputeId: string
  bullyUsername?: string
  victimUsername?: string
  caseNumber?: string
}

export interface CaseReadyPayload {
  disputeId: string
}

export interface VoteCastPayload {
  disputeId: string
  voterId: string
  vote: "FORGIVE" | "SANCTION"
}

export interface VerdictPayload {
  disputeId: string
  verdict?: string
}

export function useChatSocket(options: {
  onMessageSent: (payload: MessageSentPayload) => void
  onDisputeCreated?: (payload: DisputeCreatedPayload) => void
  onCourtModeActivated?: (payload: CourtModePayload) => void
  onUserIsolated?: (payload: UserIsolatedPayload) => void
  onCaseReady?: (payload: CaseReadyPayload) => void
  onVoteCast?: (payload: VoteCastPayload) => void
  onVerdictAnnounced?: (payload: VerdictPayload) => void
  enabled: boolean
}) {
  const {
    onMessageSent,
    onDisputeCreated,
    onCourtModeActivated,
    onUserIsolated,
    onCaseReady,
    onVoteCast,
    onVerdictAnnounced,
    enabled,
  } = options
  const socketRef = useRef<Socket | null>(null)
  const onMessageRef = useRef(onMessageSent)
  const onDisputeRef = useRef(onDisputeCreated)
  const onCourtRef = useRef(onCourtModeActivated)
  const onIsolatedRef = useRef(onUserIsolated)
  const onCaseReadyRef = useRef(onCaseReady)
  const onVoteCastRef = useRef(onVoteCast)
  const onVerdictRef = useRef(onVerdictAnnounced)
  onMessageRef.current = onMessageSent
  onDisputeRef.current = onDisputeCreated
  onCourtRef.current = onCourtModeActivated
  onIsolatedRef.current = onUserIsolated
  onCaseReadyRef.current = onCaseReady
  onVoteCastRef.current = onVoteCast
  onVerdictRef.current = onVerdictAnnounced

  useEffect(() => {
    if (!enabled) return
    const token = getStoredToken()
    if (!token) return

    const url = getSocketIoUrl()
    const socket = io(url, {
      auth: { token },
      transports: ["websocket", "polling"],
    })
    socketRef.current = socket

    socket.on("messageSent", (payload: MessageSentPayload) => {
      onMessageRef.current(payload)
    })
    socket.on("disputeCreated", (payload: DisputeCreatedPayload) => {
      onDisputeRef.current?.(payload)
    })
    socket.on("courtModeActivated", (payload: CourtModePayload) => {
      onCourtRef.current?.(payload)
    })
    socket.on("userIsolated", (payload: UserIsolatedPayload) => {
      onIsolatedRef.current?.(payload)
    })
    socket.on("caseReady", (payload: CaseReadyPayload) => {
      onCaseReadyRef.current?.(payload)
    })
    socket.on("voteCast", (payload: VoteCastPayload) => {
      onVoteCastRef.current?.(payload)
    })
    socket.on("verdictAnnounced", (payload: VerdictPayload) => {
      onVerdictRef.current?.(payload)
    })

    socket.on("connect_error", () => {
      // Optional: log or toast
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled])

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit("joinRoom", roomId)
  }, [])

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit("leaveRoom", roomId)
  }, [])

  const sendMessage = useCallback((roomId: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve(false)
        return
      }
      socketRef.current.emit("sendMessage", { roomId, message }, (err: Error | null) => {
        resolve(!err)
      })
    })
  }, [])

  const castVote = useCallback((disputeId: string, vote: "FORGIVE" | "SANCTION"): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve(false)
        return
      }
      socketRef.current.emit("voteCast", { disputeId, vote }, (err: Error | null) => {
        resolve(!err)
      })
    })
  }, [])

  return { joinRoom, leaveRoom, sendMessage, castVote, connected: !!socketRef.current?.connected }
}
