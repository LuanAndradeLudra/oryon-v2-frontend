import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import axios from 'axios'
import type { User } from '@/types'
import { appLogger } from '@/services/appLogger'
import { disconnectSocket } from '@/services/socket'

// Ensure ALL axios requests send httpOnly cookies
axios.defaults.withCredentials = true

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
const SESSION_KEY = 'oryon:session'

// Flag to prevent concurrent refresh attempts
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

interface AuthSession {
  user: User
  requiresPasswordChange: boolean
  organizationConfigured: boolean
}

interface RegisterPayload {
  companyName: string
  firstName: string
  lastName?: string
  email: string
  phone?: string
  password: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  requiresPasswordChange: boolean
  organizationConfigured: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
  completePasswordChange: (newPassword: string, currentPassword?: string) => Promise<void>
  completeOnboarding: () => void
}

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as AuthSession
    if (s.organizationConfigured === undefined) s.organizationConfigured = true
    return s
  } catch {
    return null
  }
}

function saveSession(s: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s))
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(loadSession)

  const login = useCallback(async (email: string, password: string) => {
    disconnectSocket()
    const res = await axios.post<{
      user: User; requiresPasswordChange: boolean; organizationConfigured?: boolean;
    }>(`${API}/auth/login`, { email, password }, { withCredentials: true })
    const s: AuthSession = {
      user: res.data.user,
      requiresPasswordChange: res.data.requiresPasswordChange,
      organizationConfigured: res.data.organizationConfigured ?? true,
    }
    saveSession(s)
    setSession(s)
    sessionStorage.removeItem('oryon_dismissed_banners')
    appLogger.logSessionEvent({
      tenant_id: s.user.tenantId ?? null,
      user_id:   s.user.id ?? null,
      user_role: s.user.role ?? null,
      event_type: 'login',
    })
    appLogger.logActivity({
      tenant_id:   s.user.tenantId ?? null,
      actor_id:    s.user.id ?? null,
      actor_name:  `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || null,
      action:      'user_login',
      entity_type: 'session',
      description: `Usuário "${s.user.email}" realizou login`,
      details:     { role: s.user.role },
      source:      'ui',
    })
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await axios.post<{
      user: User; requiresPasswordChange: boolean; organizationConfigured?: boolean;
    }>(`${API}/auth/register`, payload, { withCredentials: true })
    const s: AuthSession = {
      user: res.data.user,
      requiresPasswordChange: res.data.requiresPasswordChange,
      organizationConfigured: res.data.organizationConfigured ?? false,
    }
    saveSession(s)
    setSession(s)
    sessionStorage.removeItem('oryon_dismissed_banners')
    appLogger.logSessionEvent({
      tenant_id: s.user.tenantId ?? null,
      user_id:   s.user.id ?? null,
      user_role: s.user.role ?? null,
      event_type: 'login',
    })
  }, [])

  const logout = useCallback(async () => {
    disconnectSocket()
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true })
    } catch { /* best-effort — cookies will expire on their own */ }

    appLogger.logSessionEvent({
      tenant_id: session?.user.tenantId ?? null,
      user_id:   session?.user.id ?? null,
      user_role: session?.user.role ?? null,
      event_type: 'logout',
    })
    appLogger.logActivity({
      tenant_id:   session?.user.tenantId ?? null,
      actor_id:    session?.user.id ?? null,
      actor_name:  session?.user ? `${session.user.firstName ?? ''} ${session.user.lastName ?? ''}`.trim() || null : null,
      action:      'user_logout',
      entity_type: 'session',
      description: `Usuário "${session?.user.email ?? ''}" encerrou a sessão`,
      source:      'ui',
    })
    clearSession()
    setSession(null)
  }, [session])

  const completePasswordChange = useCallback(async (newPassword: string, currentPassword?: string) => {
    if (!session) return
    await axios.post(
      `${API}/auth/change-password`,
      { newPassword, currentPassword: currentPassword || newPassword },
      { withCredentials: true },
    )
    const updated: AuthSession = {
      ...session,
      requiresPasswordChange: false,
      user: { ...session.user, status: 'active', isActive: true },
    }
    saveSession(updated)
    setSession(updated)
  }, [session])

  const completeOnboarding = useCallback(() => {
    if (!session) return
    const updated: AuthSession = { ...session, organizationConfigured: true }
    saveSession(updated)
    setSession(updated)
  }, [session])

  // ── Refresh token interceptor (401 → try refresh → retry) ──────────────
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config
        if (error.response?.status === 401 && !original._retry) {
          original._retry = true
          const currentSession = loadSession()
          if (!currentSession?.user) {
            return Promise.reject(error)
          }

          if (!isRefreshing) {
            isRefreshing = true
            refreshPromise = (async () => {
              try {
                const res = await axios.post<{
                  user: User; requiresPasswordChange: boolean; organizationConfigured?: boolean
                }>(`${API}/auth/refresh`, {}, { withCredentials: true })
                const updated: AuthSession = {
                  ...currentSession,
                  user: res.data.user ?? currentSession.user,
                }
                saveSession(updated)
                setSession(updated)
                return 'refreshed'
              } catch {
                clearSession()
                setSession(null)
                return null
              } finally {
                isRefreshing = false
                refreshPromise = null
              }
            })()
          }

          const result = await refreshPromise
          if (result) {
            original.withCredentials = true
            delete original.headers?.Authorization
            return axios(original)
          }
        }
        return Promise.reject(error)
      }
    )
    return () => axios.interceptors.response.eject(interceptor)
  }, [])

  // ── Validate session on app load ────────────────────────────────────────
  useEffect(() => {
    if (!session?.user) return
    axios.get(`${API}/auth/me`, { withCredentials: true })
      .catch((err) => {
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          clearSession()
          setSession(null)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sync logout across browser tabs ────────────────────────────────────
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY && !e.newValue) {
        disconnectSocket()
        setSession(null)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      token: null, // tokens are in httpOnly cookies, not exposed to JS
      requiresPasswordChange: session?.requiresPasswordChange ?? false,
      organizationConfigured: session?.organizationConfigured ?? true,
      isAuthenticated: !!session,
      login,
      register,
      logout,
      completePasswordChange,
      completeOnboarding,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
