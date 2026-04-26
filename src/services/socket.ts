import { io, Socket } from 'socket.io-client'
import axios from 'axios'

let socket: Socket | null = null
let wsTokenCache: { token: string; expiresAt: number } | null = null

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/** Fetch a short-lived token from the backend for WebSocket auth */
async function fetchWsToken(): Promise<string | null> {
  // Return cached token if still valid (with 5s buffer)
  if (wsTokenCache && Date.now() < wsTokenCache.expiresAt - 5000) {
    return wsTokenCache.token
  }
  try {
    const res = await axios.get<{ token: string }>(`${API}/auth/ws-token`, { withCredentials: true })
    const token = res.data.token
    wsTokenCache = { token, expiresAt: Date.now() + 25_000 } // 30s token, cache for 25s
    return token
  } catch {
    return null
  }
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000', {
      auth: async (cb) => {
        const token = await fetchWsToken()
        cb({ token })
      },
      transports: ['websocket'],
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

export function joinConversation(conversationId: string) {
  socket?.emit('join:conversation', { conversationId })
}

export function leaveConversation(conversationId: string) {
  socket?.emit('leave:conversation', { conversationId })
}

export function joinChannel(channelId: string) {
  socket?.emit('join:channel', { channelId })
}

export function leaveChannel(channelId: string) {
  socket?.emit('leave:channel', { channelId })
}
