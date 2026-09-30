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

/**
 * Costura de INJEÇÃO do socket.
 *
 * Existe para o documento de demonstração da landing poder substituir o
 * tempo real por um emissor local com a mesma interface, ANTES de qualquer
 * módulo do app pedir o socket. Sem ela não há como trocar o transporte sem
 * duplicar a árvore de contextos: os handlers de produção precisam continuar
 * sendo os mesmos — é justamente isso que faz a demonstração reagir como o
 * produto reage.
 *
 * No app normal nada chama `setSocketFactory`, e o caminho abaixo é o de
 * sempre.
 */
let fabrica: (() => Socket) | null = null

/**
 * Recusa depois que o socket já existe.
 *
 * A primeira versão zerava `socket` sem desconectar: quem chamasse isto com a
 * conexão de pé deixava um socket órfão recebendo eventos e segurando o
 * transporte, enquanto o app passava a falar com outro. Como a única razão de
 * a costura existir é ser instalada ANTES de qualquer módulo pedir o socket,
 * usá-la depois é sempre erro de quem chama — e erro silencioso seria pior.
 */
export function setSocketFactory(f: (() => Socket) | null) {
  if (socket) {
    throw new Error(
      'setSocketFactory precisa ser chamada antes do primeiro getSocket(). ' +
      'O socket já foi criado; trocar a fábrica agora deixaria a conexão atual órfã.',
    )
  }
  fabrica = f
}

export function getSocket(): Socket {
  if (!socket && fabrica) socket = fabrica()
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
