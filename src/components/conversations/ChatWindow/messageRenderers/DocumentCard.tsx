import type { FC } from 'react'
import { Download } from 'lucide-react'
import type { Message } from '@/types'
import { useAuthenticatedMediaSrc } from '@/lib/mediaUrls'

/** Selo colorido por extensão — mesma ideia do card de documento do WhatsApp
 *  (quadrado vermelho "PDF" etc.), sem depender de uma lib de ícones de
 *  arquivo: é só cor + texto. */
const FILE_BADGES: Record<string, { label: string; className: string }> = {
  pdf: { label: 'PDF', className: 'bg-red-600 text-white' },
  doc: { label: 'DOC', className: 'bg-blue-600 text-white' },
  docx: { label: 'DOC', className: 'bg-blue-600 text-white' },
  xls: { label: 'XLS', className: 'bg-green-600 text-white' },
  xlsx: { label: 'XLS', className: 'bg-green-600 text-white' },
  ppt: { label: 'PPT', className: 'bg-orange-600 text-white' },
  pptx: { label: 'PPT', className: 'bg-orange-600 text-white' },
  txt: { label: 'TXT', className: 'bg-surface-500 text-white' },
  csv: { label: 'CSV', className: 'bg-surface-500 text-white' },
}
const DEFAULT_BADGE = { label: 'ARQ', className: 'bg-surface-500 text-white' }

/** `mediaMimeType` → extensão. Fonte preferida: é o dado mais confiável que
 *  existe (persistido no envio/recebimento, nunca depende do que alguém
 *  digitou). Mapa espelha getExtensionFromMimeType do MediaService (backend). */
const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
}

/** Extensão real do arquivo, ou '' quando não há uma. `mediaMimeType`
 *  primeiro (confiável); nome do arquivo só como fallback pra mensagens
 *  salvas antes desta migration.
 *
 *  Achado ao escrever o teste: `mediaCaption` do INBOUND é a legenda que o
 *  CLIENTE digitou (`waMsg.document.caption`), não o nome do arquivo — often
 *  vazia/sem extensão nenhuma ("Segue o comprovante"). Sem `mediaMimeType`,
 *  a maioria dos documentos recebidos cairia no selo genérico "ARQ".
 *
 *  Achado de teste #2: `"algo-sem-ponto".split('.').pop()` devolve a string
 *  inteira, não vazio — por isso isola o nome do arquivo primeiro e exige um
 *  ponto real nele, não em qualquer parte anterior do caminho/URL. */
function extensionOf(message: Message): string {
  if (message.mediaMimeType && MIME_TO_EXT[message.mediaMimeType]) return MIME_TO_EXT[message.mediaMimeType]
  const nameOrUrl = message.mediaCaption || message.mediaUrl || ''
  const filename = nameOrUrl.split(/[/\\]/).pop() || ''
  const dotIdx = filename.lastIndexOf('.')
  if (dotIdx <= 0) return ''
  return filename.slice(dotIdx + 1).toLowerCase().split(/[?#]/)[0]
}

function badgeFor(ext: string) {
  return FILE_BADGES[ext] ?? DEFAULT_BADGE
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Linha de metadados estilo WhatsApp: "1 página · PDF · 158 KB" — cada parte
 *  só aparece quando o dado existe (mensagens antigas, salvas antes desta
 *  migration, não têm nada disso e caem no fallback "Toque para abrir"). */
function metadataLine(message: Message, ext: string): string | null {
  const parts: string[] = []
  if (message.mediaPageCount) {
    parts.push(message.mediaPageCount === 1 ? '1 página' : `${message.mediaPageCount} páginas`)
  }
  if (ext) parts.push(ext.toUpperCase())
  if (typeof message.mediaSizeBytes === 'number') parts.push(formatFileSize(message.mediaSizeBytes))
  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * Card de documento estilo WhatsApp — miniatura real da 1ª página (PDF,
 * quando a fila assíncrona já terminou — `message.mediaThumbnailUrl`) +
 * selo colorido por tipo + nome + metadados (páginas/tipo/tamanho).
 *
 * Pedido do usuário 2026-09-22 (sem card de Jira): antes disso o documento
 * só mostrava um emoji + "Toque para abrir", sem nenhum dado real.
 */
export const DocumentCard: FC<{ message: Message; onOpen?: () => void }> = ({ message, onOpen }) => {
  const thumbSrc = useAuthenticatedMediaSrc(message.mediaThumbnailUrl ?? undefined)
  const ext = extensionOf(message)
  const badge = badgeFor(ext)
  const metadata = metadataLine(message, ext)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full text-left max-w-[280px] rounded-lg overflow-hidden bg-current/5 hover:bg-current/10 transition-colors"
    >
      {message.mediaThumbnailUrl && (
        <img
          src={thumbSrc}
          alt=""
          loading="lazy"
          className="w-full max-h-[200px] object-cover object-top border-b border-current/10"
        />
      )}
      <div className="flex items-center gap-3 py-2 px-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold tracking-wide flex-shrink-0 ${badge.className}`}>
          {badge.label}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{message.mediaCaption || 'Documento'}</p>
          <p className="text-xs opacity-60">{metadata ?? 'Toque para abrir'}</p>
        </div>
        <Download className="w-4 h-4 opacity-60 flex-shrink-0" />
      </div>
    </button>
  )
}
