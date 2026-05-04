// Inicializacao de plugins nativos do Capacitor. Roda apenas em mobile —
// no-op em web. Importado pelo main.tsx logo apos o boot do React.
//
// O que faz:
// 1. StatusBar: tema dark (icones brancos) + cor de fundo igual ao app.
// 2. Keyboard: listener publica eventos para o ChatWindow ajustar o composer.
// 3. SplashScreen: esconde apos o primeiro paint (Capacitor mantem ate
//    chamarmos hide() para evitar flash do WebView vazio).
// 4. Push tap listener: navega para data.link quando user toca a notificacao.
//
// Tudo via dynamic import para nao quebrar tree-shake em web.

import { isNativePlatform } from '@/config/env'
import { configurePushTapListener } from '@/services/push-registration'

export async function initCapacitor(): Promise<void> {
  if (!isNativePlatform()) return

  const [{ StatusBar, Style }, { Keyboard }, { SplashScreen }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/keyboard'),
    import('@capacitor/splash-screen'),
  ])

  // Tap em push → deep link. Configurado uma vez aqui (idempotente).
  void configurePushTapListener()

  try {
    // Edge-to-edge: WebView desenha sob a status bar e nav bar (visual de
    // app moderno tipo WhatsApp/Instagram). Style.Dark = icones brancos da
    // status bar (porque o fundo do app e' preto). Cor de fundo transparente
    // para o gradiente/cor do app aparecer atras dos icones.
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#00000000' })
    await StatusBar.setOverlaysWebView({ overlay: true })
  } catch {
    // alguns devices/emuladores nao suportam todos os metodos — ignora silenciosamente
  }

  // Eventos de teclado disparam CustomEvents no window — o ChatWindow escuta
  // para fazer scroll/avoid do composer. CustomEvent evita acoplar o React
  // diretamente ao plugin.
  Keyboard.addListener('keyboardWillShow', (info) => {
    window.dispatchEvent(new CustomEvent('cap:keyboardShow', { detail: { height: info.keyboardHeight } }))
  })
  Keyboard.addListener('keyboardWillHide', () => {
    window.dispatchEvent(new CustomEvent('cap:keyboardHide'))
  })

  try {
    await SplashScreen.hide({ fadeOutDuration: 200 })
  } catch {
    // se o splash nao estiver configurado o hide() falha — ignora
  }
}
