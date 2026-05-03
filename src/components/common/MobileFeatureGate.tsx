import { useState } from 'react'
import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Monitor, X, Copy, Check } from 'lucide-react'

interface MobileFeatureGateProps {
  open: boolean
  onClose: () => void
  featureName: string
  description?: string
}

const DEFAULT_DESCRIPTION =
  'Esta funcionalidade tem formulários longos, configurações detalhadas e prévia que ficam ilegíveis em viewport estreita. Abra no seu computador para uma experiência sem fricção.'

/**
 * Tela cheia que substitui wizards/configurações pesadas em mobile. Mostra
 * mensagem clara, ícone Monitor, e botão para copiar o link atual — usuário
 * cola no navegador do desktop e segue de lá.
 *
 * Uso: `{isMobile ? <MobileFeatureGate ... /> : <WizardOriginal ... />}`
 */
export function MobileFeatureGate({
  open,
  onClose,
  featureName,
  description = DEFAULT_DESCRIPTION,
}: MobileFeatureGateProps) {
  const [copied, setCopied] = useState(false)

  if (!open || typeof document === 'undefined') return null

  const handleCopy = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[60] bg-black flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <header className="flex-shrink-0 h-14 px-3 flex items-center justify-between border-b border-surface-800/60">
        <h1 className="text-sm font-semibold text-surface-100">{featureName}</h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-950/40 border border-amber-700/40 flex items-center justify-center">
          <Monitor className="w-8 h-8 text-amber-300" />
        </div>
        <h2 className="text-lg font-semibold text-surface-50">Use o desktop para esta tela</h2>
        <p className="text-sm text-surface-400 leading-relaxed max-w-xs">{description}</p>

        <button
          type="button"
          onClick={handleCopy}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-700 text-sm text-surface-200 hover:bg-surface-800 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-status-active" />
              Link copiado
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copiar link para abrir no desktop
            </>
          )}
        </button>
      </div>
    </motion.div>,
    document.body,
  )
}
