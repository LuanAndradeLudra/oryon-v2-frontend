import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import axios from 'axios'
import type { User } from '@/types'
import { appLogger } from '@/services/appLogger'
import { disconnectSocket } from '@/services/socket'
import { isNativePlatform } from '@/config/env'
import { setTokens, clearTokens, getRefreshToken } from '@/services/auth-storage'
import { registerPushNotifications, unregisterPushNotifications, syncTokenWithBackend } from '@/services/push-registration'
import { SKIP_AUTH_REFRESH } from '@/services/api'
import { resetBillingState } from '@/hooks/useBilling'

// Ensure ALL axios requests send httpOnly cookies
axios.defaults.withCredentials = true

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
const SESSION_KEY = 'oryon:session'
/** Referência estável para "nenhum flag" — evita re-render por `[]` novo a cada render. */
const EMPTY_FLAGS: string[] = []

// Note — the 401 → refresh-and-retry interceptor used to live here, but
// it was registered on `axios` global only. The `api` instance from
// services/api.ts has its own interceptor pipeline, so any request going
// through `api` (most of the app) bypassed the refresh and went straight
// to the logging interceptor that redirected to /login. Result: users
// got logged out every 15 minutes when the access token expired. The
// refresh logic now lives in services/api.ts and is registered on BOTH
// `api` and `axios` global from a single source.

interface AuthSession {
  user: User
  requiresPasswordChange: boolean
  organizationConfigured: boolean
  /** Feature flags ligadas para o tenant (chaves de `tenant_feature_flags`,
   *  ex.: `FF_MULTI_PIPELINE`). Só o `GET /auth/me` devolve — login/register/
   *  activate não. Ausente = nada ligado (SCRUM-498). */
  featureFlags?: string[]
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
  /** Flags por tenant vindas do `/auth/me`; `[]` até a hidratação chegar ou
   *  quando o backend não manda o campo. Ler via `useMultiPipeline()` etc. */
  featureFlags: string[]
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  /** Invited agent: POST /auth/activate, then same session + cookies as register. */
  activateAccount: (token: string, password: string) => Promise<void>
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

  // ── Feature flags por tenant (SCRUM-498) ────────────────────────────────
  // `/auth/me` é a única resposta que traz `featureFlags`. Grava na sessão
  // (localStorage) para o próximo boot já nascer com o valor certo em vez de
  // piscar a UI. Update funcional: se o usuário deslogou no meio da request,
  // `prev` é null e nada é gravado.
  const applyFeatureFlags = useCallback((flags: unknown) => {
    const next = Array.isArray(flags) ? flags.filter((f): f is string => typeof f === 'string') : []
    setSession((prev) => {
      if (!prev) return prev
      const updated: AuthSession = { ...prev, featureFlags: next }
      saveSession(updated)
      return updated
    })
  }, [])

  /** Best-effort: busca `/auth/me` só para hidratar `featureFlags` após um
   *  login/register/activate (essas respostas não trazem o campo). Falha é
   *  silenciosa — a sessão já está válida; sem flags, tudo fica desligado. */
  const hydrateFeatureFlags = useCallback(() => {
    axios.get<{ featureFlags?: string[] }>(`${API}/auth/me`, { withCredentials: true, ...SKIP_AUTH_REFRESH })
      .then((res) => applyFeatureFlags(res.data?.featureFlags))
      .catch(() => { /* sessão continua válida; flags ficam desligadas */ })
  }, [applyFeatureFlags])

  const login = useCallback(async (email: string, password: string) => {
    disconnectSocket()
    // Sprint 5.3 — em mobile usa /auth/mobile-login que retorna tokens em
    // body; armazenamos via auth-storage e o api.ts injeta Bearer header.
    // Em web continua /auth/login com cookies httpOnly.
    const endpoint = isNativePlatform() ? '/auth/mobile-login' : '/auth/login'
    const res = await axios.post<{
      user: User; requiresPasswordChange: boolean; organizationConfigured?: boolean;
      accessToken?: string; refreshToken?: string;
    }>(`${API}${endpoint}`, { email, password }, { withCredentials: true })
    if (isNativePlatform() && res.data.accessToken && res.data.refreshToken) {
      setTokens(res.data.accessToken, res.data.refreshToken)
    }
    const s: AuthSession = {
      user: res.data.user,
      requiresPasswordChange: res.data.requiresPasswordChange,
      organizationConfigured: res.data.organizationConfigured ?? true,
    }
    saveSession(s)
    setSession(s)
    sessionStorage.removeItem('oryon_dismissed_banners')
    hydrateFeatureFlags()
    // Sprint 5.3 — em mobile, sincroniza token de push apos login. Se o
    // listener FCM ja recebeu token (caso o boot tenha disparado registro com
    // sessao stale), reusa o token cacheado e POSTa no backend agora com
    // Bearer valido. Caso contrario dispara o registro do zero.
    if (isNativePlatform()) {
      void syncTokenWithBackend()
    }
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
  }, [hydrateFeatureFlags])

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
    hydrateFeatureFlags()
    appLogger.logSessionEvent({
      tenant_id: s.user.tenantId ?? null,
      user_id:   s.user.id ?? null,
      user_role: s.user.role ?? null,
      event_type: 'login',
    })
  }, [hydrateFeatureFlags])

  const activateAccount = useCallback(async (token: string, password: string) => {
    disconnectSocket()
    const res = await axios.post<{
      user: User
      requiresPasswordChange: boolean
      organizationConfigured?: boolean
    }>(`${API}/auth/activate`, { token, password }, { withCredentials: true })
    const s: AuthSession = {
      user: res.data.user,
      requiresPasswordChange: res.data.requiresPasswordChange,
      organizationConfigured: res.data.organizationConfigured ?? false,
    }
    saveSession(s)
    setSession(s)
    sessionStorage.removeItem('oryon_dismissed_banners')
    hydrateFeatureFlags()
    appLogger.logSessionEvent({
      tenant_id: s.user.tenantId ?? null,
      user_id:   s.user.id ?? null,
      user_role: s.user.role ?? null,
      event_type: 'login',
    })
  }, [hydrateFeatureFlags])

  const logout = useCallback(async () => {
    disconnectSocket()
    const prev = session
    const refreshToken = isNativePlatform() ? getRefreshToken() : undefined
    // Sprint 5.3 — desregistra push antes de limpar tokens (precisa do Bearer).
    if (isNativePlatform()) {
      try { await unregisterPushNotifications() } catch { /* best-effort */ }
    }
    // Limpa sessão React/localStorage primeiro para o RequireGuest liberar
    // /login imediatamente, mesmo se o POST /auth/logout falhar com 401.
    clearSession()
    setSession(null)
    // Zera o store module-scoped de billing (SCRUM-172) para não vazar
    // saldo/plano do tenant que saiu para a próxima sessão.
    resetBillingState()
    try {
      const body = isNativePlatform() ? { refreshToken: refreshToken ?? undefined } : {}
      await axios.post(`${API}/auth/logout`, body, {
        withCredentials: true,
        ...SKIP_AUTH_REFRESH,
      })
    } catch { /* best-effort — cookies will expire on their own */ }
    clearTokens()

    appLogger.logSessionEvent({
      tenant_id: prev?.user.tenantId ?? null,
      user_id:   prev?.user.id ?? null,
      user_role: prev?.user.role ?? null,
      event_type: 'logout',
    })
    appLogger.logActivity({
      tenant_id:   prev?.user.tenantId ?? null,
      actor_id:    prev?.user.id ?? null,
      actor_name:  prev?.user ? `${prev.user.firstName ?? ''} ${prev.user.lastName ?? ''}`.trim() || null : null,
      action:      'user_logout',
      entity_type: 'session',
      description: `Usuário "${prev?.user.email ?? ''}" encerrou a sessão`,
      source:      'ui',
    })
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

  // ── Validate session on app load ────────────────────────────────────────
  useEffect(() => {
    if (!session?.user) return
    axios.get<{ featureFlags?: string[] }>(`${API}/auth/me`, { withCredentials: true, ...SKIP_AUTH_REFRESH })
      // Sessão válida: aproveita a mesma resposta para (re)hidratar as flags
      // por tenant — é aqui que um flag ligado/desligado no banco chega à UI
      // sem novo build (SCRUM-498).
      .then((res) => applyFeatureFlags(res.data?.featureFlags))
      .catch((err) => {
        const status = err?.response?.status
        if (status === 401 || status === 403) {
          clearSession()
          clearTokens()
          setSession(null)
          const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/activate']
          if (!publicPaths.includes(window.location.pathname)) {
            window.location.href = '/login'
          }
        }
      })
    // Sprint 5.3 — em mobile, reativa registro de push em retornos do app
    // (caso o token tenha sido revogado em background ou o user reinstalou).
    // Idempotente no backend (upsert por userId+token).
    if (isNativePlatform()) {
      void registerPushNotifications()
    }
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
      featureFlags: session?.featureFlags ?? EMPTY_FLAGS,
      isAuthenticated: !!session,
      login,
      register,
      activateAccount,
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
