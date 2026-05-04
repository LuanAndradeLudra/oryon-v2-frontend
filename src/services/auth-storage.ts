import { isNativePlatform } from '@/config/env'

/**
 * Sprint 5.3 — armazenamento de tokens para clientes mobile.
 *
 * Em web a infra continua sendo cookies httpOnly setados pelo backend; este
 * modulo e' no-op (todos os getters retornam null, setters nao gravam).
 *
 * Em mobile (Capacitor), tokens sao mantidos em memoria + localStorage do
 * WebView. Esse storage e' privado ao app no Android (sandbox de aplicativo)
 * e iOS (sandbox WebKit). Para v1 e' um trade-off aceitavel — Sprint 6+
 * pode migrar para Keychain/Keystore via plugin community se necessario.
 *
 * O api.ts injeta o token via Authorization: Bearer header quando isNative
 * Platform() — o backend ja aceita esse header em jwt.strategy.ts.
 */

const KEY_ACCESS = 'oryon:mobile-access-token'
const KEY_REFRESH = 'oryon:mobile-refresh-token'

let accessTokenCache: string | null = null
let refreshTokenCache: string | null = null

export function hydrateAuthStorage(): void {
  if (!isNativePlatform()) return
  accessTokenCache = localStorage.getItem(KEY_ACCESS)
  refreshTokenCache = localStorage.getItem(KEY_REFRESH)
}

export function getAccessToken(): string | null {
  return accessTokenCache
}

export function getRefreshToken(): string | null {
  return refreshTokenCache
}

export function setTokens(access: string, refresh: string): void {
  if (!isNativePlatform()) return
  accessTokenCache = access
  refreshTokenCache = refresh
  localStorage.setItem(KEY_ACCESS, access)
  localStorage.setItem(KEY_REFRESH, refresh)
}

export function setAccessToken(access: string): void {
  if (!isNativePlatform()) return
  accessTokenCache = access
  localStorage.setItem(KEY_ACCESS, access)
}

export function clearTokens(): void {
  accessTokenCache = null
  refreshTokenCache = null
  localStorage.removeItem(KEY_ACCESS)
  localStorage.removeItem(KEY_REFRESH)
}
