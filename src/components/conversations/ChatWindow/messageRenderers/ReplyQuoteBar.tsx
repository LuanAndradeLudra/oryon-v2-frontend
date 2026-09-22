import type { FC } from 'react'
import type { Message } from '@/types'
import { cn } from '@/lib/utils'

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
 *
 * SCRUM-1158 — clicking it jumps to the quoted message (scroll + flash),
 * mirroring WhatsApp. Only clickable when `quoted` was actually resolved:
 * `onClick` is undefined otherwise, and there's nothing sensible to jump to.
 */
export const ReplyQuoteBar: FC<{ message: Message; quoted?: Message | null; onClick?: () => void }> = ({ quoted, onClick }) => {
  const clickable = !!onClick
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? (e) => { e.stopPropagation(); onClick!() } : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClick!() } } : undefined}
      className={cn(
        'mb-1 rounded-md bg-current/10 border-l-2 border-current/40 px-2 py-1 max-w-full',
        clickable && 'cursor-pointer hover:bg-current/15 transition-colors'
      )}
    >
      {quoted ? (
        <>
          {/* `line-clamp-1` em vez de `truncate`: `truncate` é `white-space:
              nowrap`, uma linha inquebrável cuja largura mínima vence o
              `max-w-[72%]` da bolha quando a mensagem citada é longa — a
              bolha inteira estourava a largura do chat (e o texto normal só
              preenchia o espaço já estourado). `line-clamp` deixa o texto
              quebrar normalmente e só corta visualmente após 1 linha. */}
          <p className="text-[11px] font-medium opacity-70 line-clamp-1 break-words">{authorOf(quoted)}</p>
          <p className="text-xs opacity-80 line-clamp-1 break-words">{previewOf(quoted)}</p>
        </>
      ) : (
        <p className="text-xs opacity-60 italic line-clamp-1">Mensagem original</p>
      )}
    </div>
  )
}
