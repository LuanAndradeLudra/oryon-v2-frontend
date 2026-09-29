/**
 * Ao abrir/recarregar o app, a sessão é conferida com GET /auth/me. O token de
 * acesso dura pouco: quando já venceu, o /auth/me responde 401 e a pessoa era
 * deslogada NA HORA, com o cookie de renovação ainda válido (bug também na
 * developer, 29/09). Agora: 401 → renova → confere de novo; só desloga se a
 * renovação falhar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

const get = vi.hoisted(() => vi.fn())
const attemptRefresh = vi.hoisted(() => vi.fn())

vi.mock('axios', () => ({ default: { get, post: vi.fn(), isAxiosError: () => false, defaults: { headers: { common: {} } }, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } } }))
vi.mock('@/services/api', () => ({ SKIP_AUTH_REFRESH: { _skipAuthRefresh: true }, attemptRefresh }))
vi.mock('@/services/appLogger', () => ({ appLogger: new Proxy({}, { get: () => vi.fn() }) }))
vi.mock('@/services/socket', () => ({ disconnectSocket: vi.fn() }))
vi.mock('@/config/env', () => ({ isNativePlatform: () => false, apiBaseUrl: () => 'http://api' }))
vi.mock('@/services/auth-storage', () => ({ setTokens: vi.fn(), clearTokens: vi.fn(), getRefreshToken: vi.fn() }))
vi.mock('@/services/push-registration', () => ({
  registerPushNotifications: vi.fn(), unregisterPushNotifications: vi.fn(), syncTokenWithBackend: vi.fn(),
}))
vi.mock('@/hooks/useBilling', () => ({ resetBillingState: vi.fn() }))

const SESSION_KEY = 'oryon:session'
const erro401 = () => Object.assign(new Error('401'), { response: { status: 401 } })

function Quem() {
  const { user } = useAuth()
  return <p>{user ? `logado:${user.id}` : 'deslogado'}</p>
}

describe('AuthContext · conferir a sessão ao abrir o app', () => {
  beforeEach(() => {
    get.mockReset()
    attemptRefresh.mockReset()
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: { id: 'u1' }, requiresPasswordChange: false, organizationConfigured: true }))
    // O redirecionamento para /login usa window.location.href.
    Object.defineProperty(window, 'location', { value: { ...window.location, pathname: '/contacts', href: '' }, writable: true })
  })

  it('token vencido mas renovação ok: renova, confere de novo e continua logado', async () => {
    get.mockRejectedValueOnce(erro401()).mockResolvedValueOnce({ data: { featureFlags: [] } })
    attemptRefresh.mockResolvedValue(true)
    render(<AuthProvider><Quem /></AuthProvider>)
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(attemptRefresh).toHaveBeenCalledTimes(1)
    expect(screen.getByText('logado:u1')).toBeInTheDocument()
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull()
  })

  it('renovação também falha: desloga (comportamento de antes, agora só quando é mesmo o caso)', async () => {
    get.mockRejectedValue(erro401())
    attemptRefresh.mockResolvedValue(false)
    render(<AuthProvider><Quem /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('deslogado')).toBeInTheDocument())
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })
})
