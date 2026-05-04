import { Capacitor } from '@capacitor/core'

/**
 * Sprint 5.3 — central de URLs para cliente HTTP/WS.
 *
 * Em web: usa VITE_API_URL/VITE_WS_URL como antes.
 * Em mobile (Capacitor.isNativePlatform()): se VITE_API_URL_NATIVE_DEV estiver
 * setada (npm run dev:mobile faz isso automaticamente), usa-a — caso contrario
 * cai no VITE_API_URL. Em prod nativo, VITE_API_URL aponta para
 * https://api.oryon.app (definido em .env.production).
 */

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

export function apiBaseUrl(): string {
  if (isNativePlatform()) {
    const nativeDev = import.meta.env.VITE_API_URL_NATIVE_DEV
    if (nativeDev) return nativeDev
  }
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
}

export function wsBaseUrl(): string {
  if (isNativePlatform()) {
    const nativeDev = import.meta.env.VITE_WS_URL_NATIVE_DEV
    if (nativeDev) return nativeDev
  }
  return import.meta.env.VITE_WS_URL ?? 'http://localhost:3000'
}
