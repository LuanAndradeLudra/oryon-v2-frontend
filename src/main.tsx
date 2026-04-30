// Sentry instrumentation MUST be the first import so the SDK installs
// before React mounts. No-op when VITE_SENTRY_DSN is unset.
import './instrument'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/emojiText' // registers <em-emoji> web component globally
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
