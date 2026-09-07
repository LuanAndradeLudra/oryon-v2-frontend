// ─── ContactListModal ──────────────────────────────────────────────────────
// "Ver os N" do público — quem exatamente vai receber.
//
// MUDOU DE CASA E DE FONTE (D2-plano §4, avisado ao Lince desde o plano).
// Estava co-locado dentro de `steps/Step5Revisao.tsx` porque só o modal antigo
// o usava; agora tem dois consumidores — o `Step5Revisao` do wizard e o
// `BlockPublico` do Composer —, o que derruba a justificativa da
// co-localização.
//
// E deixou de calcular a lista: antes recebia `contacts: Contact[]` mais os
// doze filtros e refazia a segmentação em memória, o que só funcionava porque
// o wizard carrega a base inteira. O público novo (D6) vive no servidor e
// pagina de verdade, então o modal passa a receber `{ items, total, page,
// limit }` já resolvidos. Quem chama decide a fonte: o wizard passa o que já
// filtrou como "página única com tudo", o Composer passa o retorno do
// `useAudiencePreview` do Crivo.
import { useState } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { getReadableTextColor } from '@/lib/colorPalette'

/** O mínimo que a lista precisa de um contato. Estrutural de propósito: o
 *  `Contact` inteiro do wizard serve, e o `SegmentSampleContact` que o
 *  `/campaigns/segments/preview` devolve — que tem só id, nome, waId e
 *  estágio — também. Pedir `Contact` obrigaria o Composer a inventar os
 *  campos que o endpoint não manda. */
export interface ContactListItem {
  id: string
  displayName: string
  waId: string
  stage?: string | null
  tags?: { id: string; name: string }[]
}

interface ContactListModalProps {
  open: boolean
  items: ContactListItem[]
  /** Tamanho da lista INTEIRA, não o da página. */
  total: number
  page: number
  limit: number
  loading?: boolean
  /** Falha de carga. Existe separado de "lista vazia" porque as duas coisas
   *  não são a mesma: público desconhecido não é público sem ninguém. */
  error?: string | null
  stages?: { key: string; label: string; color: string }[]
  onPageChange: (page: number) => void
  onClose: () => void
}

export function ContactListModal({
  open, items, total, page, limit, loading = false, error = null,
  stages = [], onPageChange, onClose,
}: ContactListModalProps) {
  const [search, setSearch] = useState('')

  // A busca filtra EM MEMÓRIA, então só é honesta quando a lista inteira está
  // aqui. Paginado, ela responderia "nenhum contato encontrado" sobre uma base
  // que nunca olhou — e o operador concluiria que o contato não entrou no
  // público. Enquanto o preview não tiver busca no servidor, o campo
  // simplesmente não aparece na página parcial.
  const wholeListLoaded = items.length >= total
  const term = search.trim().toLowerCase()
  const shown = wholeListLoaded && term
    ? items.filter((c) => c.displayName.toLowerCase().includes(term) || c.waId.includes(term))
    : items

  const pages = Math.max(1, Math.ceil(total / Math.max(1, limit)))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lista de contatos"
      className="max-h-[80vh]"
      fillHeight
      footer={
        <div className="flex items-center justify-between gap-3">
          {pages > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost" size="sm"
                disabled={page <= 1 || loading}
                onClick={() => onPageChange(page - 1)}
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-surface-400 tabular-nums">
                Página {page} de {pages}
              </span>
              <Button
                variant="ghost" size="sm"
                disabled={page >= pages || loading}
                onClick={() => onPageChange(page + 1)}
                aria-label="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : <span />}
          {/* "Fechar e continuar", e nao "Fechar": o X do cabecalho ja' se
              chama Fechar, e dois controles com o mesmo nome acessivel deixam
              o leitor de tela sem como distinguir um do outro. */}
          <Button variant="secondary" size="sm" onClick={onClose}>Fechar e continuar</Button>
        </div>
      }
    >
      <div className="flex flex-col min-h-0 flex-1 gap-3">
        <p className="text-xs text-surface-500 flex-shrink-0">
          {total} contato{total === 1 ? '' : 's'} nesta lista
        </p>

        {wholeListLoaded && (
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar nesta lista"
              placeholder="Buscar nesta lista..."
              className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-8 pr-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {error ? (
            <p className="text-xs text-accent-rose text-center py-8">{error}</p>
          ) : loading ? (
            <div className="flex items-center justify-center py-8" role="status" aria-label="Carregando contatos">
              <Spinner />
            </div>
          ) : shown.length === 0 ? (
            <p className="text-xs text-surface-500 text-center py-8">
              {term ? 'Nenhum contato bate com a busca' : 'Nenhum contato nesta lista'}
            </p>
          ) : (
            <div className="space-y-0.5">
              {shown.map((c) => {
                const stageDef = stages.find((s) => s.key === c.stage)
                return (
                  <div key={c.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-brand-500/15 text-brand-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {c.displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-100 truncate">{c.displayName}</p>
                      <p className="text-xs text-surface-500">{c.waId}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {stageDef && (
                        <span
                          className="text-3xs px-1.5 py-0.5 rounded font-medium"
                          style={{ backgroundColor: stageDef.color, color: getReadableTextColor(stageDef.color) }}
                        >
                          {stageDef.label}
                        </span>
                      )}
                      {c.tags && c.tags.length > 0 && (
                        <span className="text-3xs text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">
                          {c.tags[0].name}{c.tags.length > 1 ? ` +${c.tags.length - 1}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
