import type { FC } from 'react'
import type { Message } from '@/types'

/** One-line preview of a quoted message for the reply bar. */
function previewOf(m: Message): string {
  if (m.body && m.body.trim()) return m.body.trim()
  switch (m.type) {
    case 'image': return '📷 Imagem'
    case 'video': return '🎥 Vídeo'
    case 'audio': return '🎤 Áudio'
    case 'document': return '📄 Documento'
    case 'sticker': return 'Figurinha'
    case 'location': return '📍 Localização'
    case 'contacts': return '👤 Contato'
    default: return 'Mensagem'
  }
}

function authorOf(m: Message): string {
  if (m.direction === 'outbound') return m.sentByUser?.firstName ?? 'IA'
  return 'Cliente'
}

/**
 * WhatsApp-style quoted-reply bar rendered at the top of a bubble when the
 * message replies to another (`contextWamid`). `quoted` is resolved by
 * MessageList from the already-loaded window; when it isn't available
 * (e.g. the original is outside the loaded page) we degrade gracefully.
 */
export const ReplyQuoteBar: FC<{ message: Message; quoted?: Message | null }> = ({ quoted }) => {
  return (
    <div className="mb-1 rounded-md bg-current/10 border-l-2 border-current/40 px-2 py-1 max-w-full">
      {quoted ? (
        <>
          <p className="text-[11px] font-medium opacity-70 truncate">{authorOf(quoted)}</p>
          <p className="text-xs opacity-80 truncate">{previewOf(quoted)}</p>
        </>
      ) : (
        <p className="text-xs opacity-60 italic truncate">Mensagem original</p>
      )}
    </div>
  )
}
