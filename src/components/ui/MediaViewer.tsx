import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react'
import { useLayer } from '@/contexts/LayerContext'
import { useImageZoom } from '@/hooks/useImageZoom'
import { MediaViewerCtx } from '@/contexts/mediaViewerCore'
import { useAuthenticatedMediaSrc } from '@/lib/mediaUrls'
import { downloadMedia } from '@/lib/downloadMedia'
import { isNativePlatform } from '@/config/env'
import type { Message } from '@/types'

/**
 * Visualizador in-app estilo WhatsApp — abre imagem/vídeo/PDF numa camada
 * escura de tela cheia em vez de `window.open` numa nova guia (pedido do
 * usuário 2026-09-22, sem card de Jira).
 *
 * PDF v1: `<iframe>` com o visualizador nativo do navegador. Decisão
 * explícita (não é preguiça): dentro da WebView do Capacitor (app mobile)
 * não existe plugin de PDF embutido — um iframe lá tende a ficar em branco.
 * `isNativePlatform()` faz o gate: no app nativo cai pro botão de baixar em
 * vez de tentar (e falhar) o preview inline. Evolução planejada: trocar o
 * iframe por `pdfjs-dist` desenhando em canvas, que funciona nas duas
 * plataformas — nesse dia só o branch de PDF muda, o resto do visualizador
 * (estado, overlay, download) fica igual.
 *
 * DOC/XLS/PPT: nenhum navegador renderiza isso nativamente (nem o WhatsApp
 * tenta) — sempre cai no botão de baixar, em qualquer plataforma.
 */
function MediaViewerOverlay({ message, onClose }: { message: Message | null; onClose: () => void }) {
  const open = !!message
  const { zIndex } = useLayer(open, onClose)
  const src = useAuthenticatedMediaSrc(message?.mediaUrl)
  const isImageLike = message?.type === 'image' || message?.type === 'sticker'
  // Zoom só pra imagem (PDF já tem o zoom do próprio visualizador do
  // navegador; vídeo não faz sentido). `resetKey`: cada mensagem abre em 1x.
  const zoom = useImageZoom({ enabled: open && isImageLike, resetKey: message?.id })

  if (typeof document === 'undefined') return null

  const isPdf = message?.type === 'document' && (message.mediaMimeType === 'application/pdf' || message.mediaCaption?.toLowerCase().endsWith('.pdf'))
  const canPreviewInline = isImageLike || message?.type === 'video' || (isPdf && !isNativePlatform())

  let body: ReactNode = null
  if (message) {
    if (isImageLike) {
      body = (
        <img
          src={src}
          alt={message.mediaCaption || 'Imagem'}
          className="max-w-full max-h-full object-contain"
          {...zoom.imgProps}
        />
      )
    } else if (message.type === 'video') {
      body = <video src={src} controls autoPlay className="max-w-full max-h-full" />
    } else if (isPdf && !isNativePlatform()) {
      body = <iframe src={src} title={message.mediaCaption || 'Documento'} className="w-full h-full bg-white rounded" />
    } else {
      // DOC/XLS/PPT em qualquer plataforma, ou PDF dentro do app nativo —
      // sem preview inline possível, oferece o download direto.
      body = (
        <div className="flex flex-col items-center gap-3 text-surface-100">
          <p className="text-sm opacity-80">Este arquivo não pode ser exibido aqui.</p>
          <button
            type="button"
            onClick={() => void downloadMedia(src, message.mediaCaption ?? undefined)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Baixar {message.mediaCaption || 'arquivo'}
          </button>
        </div>
      )
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center p-4 md:p-10"
          style={{ zIndex }}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 bg-black/90" />

          <div
            ref={isImageLike ? zoom.containerRef : undefined}
            className="relative z-10 flex items-center justify-center w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {body}
          </div>

          {/* stopPropagation: esta barra é irmã do container da mídia (que já
              o faz), não filha — sem isto, o clique em QUALQUER botão dela
              borbulha até o onClick do overlay e FECHA o visualizador
              (zoom fecharia a tela; "Baixar" já baixava e fechava junto). */}
          <div
            className="absolute top-4 right-4 z-20 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {isImageLike && (
              // Controles de zoom (pedido do usuário 2026-09-23). O % é
              // também o botão de "restaurar" (volta pra 100%, ajustado à
              // tela) — mesmo padrão dos visualizadores de imagem comuns.
              <div className="flex items-center gap-1 rounded-full bg-white/10 p-0.5" role="group" aria-label="Zoom">
                <button
                  type="button"
                  onClick={zoom.zoomOut}
                  disabled={!zoom.canZoomOut}
                  title="Diminuir zoom (-)"
                  aria-label="Diminuir zoom"
                  className="w-8 h-8 rounded-full hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-center text-white transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={zoom.reset}
                  title="Restaurar zoom (0)"
                  aria-label="Restaurar zoom"
                  className="min-w-[3.25rem] h-8 px-1 rounded-full hover:bg-white/20 text-white text-xs font-medium tabular-nums transition-colors"
                >
                  {Math.round(zoom.zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={zoom.zoomIn}
                  disabled={!zoom.canZoomIn}
                  title="Aumentar zoom (+)"
                  aria-label="Aumentar zoom"
                  className="w-8 h-8 rounded-full hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-center text-white transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            )}
            {canPreviewInline && (
              <button
                type="button"
                onClick={() => void downloadMedia(src, message?.mediaCaption ?? undefined)}
                title="Baixar"
                aria-label="Baixar"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Fechar"
              aria-label="Fechar"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function MediaViewerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<Message | null>(null)

  const open = useCallback((m: Message) => setMessage(m), [])
  const close = useCallback(() => setMessage(null), [])

  const value = useMemo(() => ({ open }), [open])

  return (
    <MediaViewerCtx.Provider value={value}>
      {children}
      <MediaViewerOverlay message={message} onClose={close} />
    </MediaViewerCtx.Provider>
  )
}

export { useMediaViewer } from '@/contexts/mediaViewerCore'
