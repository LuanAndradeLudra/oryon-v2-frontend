// Sprint 5.3 — registro/desregistro de push notifications via FCM em mobile.
//
// Fluxo de registro (chamado depois de login bem-sucedido em mobile):
//   1. PushNotifications.requestPermissions() — pede permissao ao usuario
//      (Android 13+ exige permissao explicita; abaixo disso e' implicita)
//   2. PushNotifications.register() — handshake com FCM
//   3. listener 'registration' recebe o token FCM e faz POST /push/register-token
//   4. listener 'registrationError' loga falha — push fica desativado mas o
//      app continua funcionando normalmente
//
// Fluxo de tap (configurado uma vez no boot via configurePushTapListener):
//   - 'pushNotificationActionPerformed' dispara quando usuario toca a notificacao
//     com app fechado/background. Extrai data.link e navega via window.location.
//
// Web e' no-op em todos os fluxos.

import { isNativePlatform } from '@/config/env'
import { api } from './api'
import { Capacitor } from '@capacitor/core'

// Token FCM em memoria: cacheado quando o listener 'registration' dispara
// (apos o handshake com FCM). Reusado por syncTokenWithBackend() — chamado
// pelo AuthContext logo apos login completar para garantir que o token
// chegue ao backend COM auth valida (evita o caso onde o listener disparou
// antes do login terminar).
let lastFcmToken: string | null = null
let listenersSetup = false
let registerCalled = false

/**
 * Registra device para push: pede permissao, configura listeners (uma vez),
 * e chama PushNotifications.register() que dispara o handshake com FCM.
 * Quando o token chega, listener 'registration' tenta persistir no backend
 * (best-effort — se nao tiver auth, falha silente e fica em cache).
 */
export async function registerPushNotifications(): Promise<void> {
  if (!isNativePlatform()) return

  const { PushNotifications } = await import('@capacitor/push-notifications')

  // Listeners — setup unico por instancia do app
  if (!listenersSetup) {
    PushNotifications.addListener('registration', (token) => {
      lastFcmToken = token.value
      void persistTokenOnBackend(token.value)
    })
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[push] registration error:', err.error)
    })
    listenersSetup = true
  }

  // Permissao
  const perm = await PushNotifications.requestPermissions()
  if (perm.receive !== 'granted') {
    console.warn('[push] permission denied:', perm.receive)
    return
  }

  // Handshake FCM. Se chamado multiplas vezes, FCM responde com o mesmo token —
  // fine, o backend faz upsert. registerCalled apenas evita ruido de log.
  await PushNotifications.register()
  registerCalled = true
}

/**
 * Re-POSTa o token FCM cacheado para o backend. Chamado pelo AuthContext
 * apos login bem-sucedido, garantindo que o token chegue com Bearer valido.
 * Se o token ainda nao foi recebido do FCM (registerCalled = false), dispara
 * registerPushNotifications() — o listener fara o post quando o token chegar.
 */
export async function syncTokenWithBackend(): Promise<void> {
  if (!isNativePlatform()) return

  if (lastFcmToken) {
    await persistTokenOnBackend(lastFcmToken)
    return
  }

  // Token ainda nao chegou: dispara o fluxo de registro (idempotente)
  if (!registerCalled) {
    await registerPushNotifications()
  }
}

async function persistTokenOnBackend(token: string): Promise<void> {
  try {
    await api.post('/push/register-token', {
      token,
      platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
      appVersion: import.meta.env.VITE_APP_VERSION ?? null,
    })
  } catch (err) {
    // Best-effort — push fica off mas auth continua funcional.
    console.error('[push] failed to register token on backend:', err)
  }
}

/** Revoga o token no backend e limpa state local. Chamado no logout. */
export async function unregisterPushNotifications(): Promise<void> {
  if (!isNativePlatform()) return
  if (!registerCalled && !lastFcmToken) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    // Limpa as notificacoes da bandeja
    try { await PushNotifications.removeAllDeliveredNotifications() } catch { /* ignore */ }
  } catch {
    // ignore
  }

  // Revoga o token no backend se ainda tiver auth valido (logout chamou esse
  // metodo antes de limpar tokens). Best-effort — se falhar, expiracao natural
  // do token cuida via push.service.revokeBulk quando FCM rejeitar.
  if (lastFcmToken) {
    try { await api.delete('/push/token', { data: { token: lastFcmToken } }) } catch { /* ignore */ }
  }
  lastFcmToken = null
  registerCalled = false
}

/** Configura o handler de tap em push (deep link). Chamar uma vez no boot do app. */
export async function configurePushTapListener(): Promise<void> {
  if (!isNativePlatform()) return

  const { PushNotifications } = await import('@capacitor/push-notifications')

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    // Payload do FCM passa por data — push.service.ts envia link em data.link
    const link = action.notification.data?.link
    if (typeof link === 'string' && link.startsWith('/')) {
      // Navega via window.location pra forcar resync de Auth/Socket — o app
      // estava em background e pode ter session expirada/socket desconectado.
      window.location.assign(link)
    }
  })
}
