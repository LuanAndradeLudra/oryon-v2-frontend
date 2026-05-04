// Sentry instrumentation MUST be the first import so the SDK installs
// before React mounts. No-op when VITE_SENTRY_DSN is unset.
import './instrument'
// Polyfill crypto.randomUUID para HTTP/IP nao-seguro (dev mobile via LAN).
// Em HTTPS/localhost o nativo continua sendo usado.
import './lib/cryptoPolyfill'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/emojiText' // registers <em-emoji> web component globally
import App from './App.tsx'
import { hydrateAuthStorage } from './services/auth-storage'
import { isNativePlatform } from './config/env'
import { initCapacitor } from './lib/capacitor-init'

// Sprint 5.3 — em mobile, hidrata os tokens armazenados no localStorage do
// WebView para o cache em memoria antes de qualquer request HTTP. No-op em
// web (cookies httpOnly cuidam disso transparentemente).
hydrateAuthStorage()

// Inicializa StatusBar / Keyboard / SplashScreen apos o boot do React.
// Roda async em paralelo — nao bloqueia o render inicial.
void initCapacitor()

// Sprint 5.4 — handlers de lifecycle Capacitor (deep link + resume). Usa
// dynamic import para nao quebrar o tree-shake em web. O App.addListener
// recebe um payload com a url disparada pela notificacao push ou abertura
// externa via App Links / oryon:// scheme.
if (isNativePlatform()) {
  void (async () => {
    const { App: CapApp } = await import('@capacitor/app')
    CapApp.addListener('appUrlOpen', (event) => {
      const incoming = event.url
      // oryon://conversations?id=<uuid> ou https://oryon.app/conversations?id=...
      try {
        const u = new URL(incoming)
        const target = u.pathname + u.search
        if (target && target !== '/') {
          window.location.assign(target)
        }
      } catch {
        // ignora URLs malformadas
      }
    })
  })()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
