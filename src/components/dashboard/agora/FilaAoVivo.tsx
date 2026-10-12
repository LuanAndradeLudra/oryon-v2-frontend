import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, ChevronDown, Clock, Inbox, UserPlus } from 'lucide-react'
import { GUARD_LIST_BADGE_TITLE } from '@/lib/guardReason'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { EmptyState } from '@/components/ui/EmptyState'
import { Paginacao } from '@/components/ui/Paginacao'
import { paginar } from '@/lib/paginar'
import { formatarEspera, type FaixaDePrazo, type ItemDaFila } from '@/lib/filaAgora'
import type { AvailableUser } from '@/services/api'
import type { Conversation } from '@/types'

// A fila da direção A: quem espera uma pessoa, da maior espera para a menor,
// com o prazo à vista e as duas ações do PO (27/09) sem sair do painel —
// Assumir (atribui a mim e abre a conversa) e Atribuir (escolhe alguém).

export type FiltroDaFila = 'todas' | 'sem-dono' | 'janela'

/** Conversas por página. A lista rola dentro do cartão (altura fixa, PO 28/09). */
const POR_PAGINA = 20

const CHIP_DA_FAIXA: Record<FaixaDePrazo, string> = {
  atrasada: 'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-danger',
  'vence-em-breve': 'bg-status-pending-bg text-status-pending',
  'no-prazo': 'bg-[var(--sf2)] text-surface-400',
}

const ROTULO_DA_FAIXA: Record<FaixaDePrazo, string> = {
  atrasada: 'passou do prazo',
  'vence-em-breve': 'vence em breve',
  'no-prazo': 'no prazo',
}

function nomeDe(u: { firstName: string; lastName?: string | null }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ')
}

function rotuloDaLinha(c: Conversation): string {
  const l = c.whatsappNumber
  return l?.label || l?.displayPhoneNumber || ''
}

interface Props {
  itens: ItemDaFila[]
  /** Quantos há em cada filtro (antes de filtrar). */
  contagens: Record<FiltroDaFila, number>
  filtro: FiltroDaFila
  onFiltro: (f: FiltroDaFila) => void
  equipe: AvailableUser[]
  meuId: string | undefined
  /** Mais de uma linha: a linha aparece em cada conversa. */
  mostrarLinha: boolean
  /**
   * A lista não coube inteira (teto de carga): o aviso diz quantas carregaram
   * de quantas há. As sem dono vêm sempre inteiras até o teto; as com dono,
   * as mais recentes.
   */
  truncada: boolean
  carregadas?: number
  totalReal?: number
  /** Conversa com ação em andamento (desabilita a linha). */
  ocupadaId: string | null
  onAbrir: (item: ItemDaFila) => void
  onAssumir: (item: ItemDaFila) => void
  onAtribuir: (item: ItemDaFila, userId: string | null) => void
  /** Página da fila (1-based; vive na URL). */
  pagina: number
  onPagina: (p: number) => void
  celular?: boolean
}

const FILTROS: Array<{ id: FiltroDaFila; rotulo: string }> = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'sem-dono', rotulo: 'Sem dono' },
  // SCRUM-1253 (PO, 11/10): saiu o filtro das que a IA passou — com IA em
  // todas as linhas ele repetia "Todas", e a origem não muda o que o operador
  // faz. `?fila=ia-passou` em links antigos cai em "Todas".
  { id: 'janela', rotulo: 'Janela fechando' },
]

export function FilaAoVivo({
  itens, contagens, filtro, onFiltro, equipe, meuId, mostrarLinha, truncada, carregadas, totalReal, ocupadaId,
  onAbrir, onAssumir, onAtribuir, pagina, onPagina, celular = false,
}: Props) {
  const [menuDe, setMenuDe] = useState<string | null>(null)
  const pag = paginar(itens, pagina, POR_PAGINA)
  // Trocar de página volta a rolagem interna para o topo.
  const rolagem = useRef<HTMLDivElement>(null)
  useEffect(() => { rolagem.current?.scrollTo?.({ top: 0 }) }, [pag.pagina])

  return (
    <section
      aria-labelledby="fila-agora-titulo"
      className="flex flex-col h-[min(640px,75vh)] xl:h-[600px] bg-surface-800 border border-surface-700 rounded-[10px] overflow-hidden"
      data-testid="fila-ao-vivo"
    >
      <header className="flex-shrink-0 flex items-center gap-2 min-h-10 px-3.5 py-1.5 border-b border-surface-700 flex-wrap">
        <h2 id="fila-agora-titulo" className="text-sm font-semibold text-surface-100">Fila agora</h2>
        <span className="text-xs text-surface-400 tabular-nums">{contagens.todas}</span>
        {/* Num cartão estreito os filtros descem para a linha de baixo e rolam de lado,
            em vez de vazar do cartão (SCRUM-1253). */}
        <div className="ml-auto flex items-center gap-1 max-w-full overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Filtrar a fila">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filtro === f.id}
              onClick={() => onFiltro(f.id)}
              className={cn(
                'inline-flex items-center gap-1.5 h-6 px-2 rounded-[6px] text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors',
                filtro === f.id
                  ? 'bg-[var(--ink-bg)] bg-(image:--ink-grad) text-[var(--ink-fg)]'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-[var(--rowhover)]',
              )}
            >
              {f.rotulo}
              <span className={cn('tabular-nums', filtro === f.id ? 'opacity-80' : 'text-surface-500')}>{contagens[f.id]}</span>
            </button>
          ))}
        </div>
      </header>

      <div ref={rolagem} className="flex-1 min-h-0 overflow-y-auto" data-testid="fila-rolagem">
      {itens.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Inbox}
            title={filtro === 'todas' ? 'Ninguém esperando uma pessoa agora' : 'Nada neste filtro agora'}
            hint={filtro === 'todas'
              ? 'Aparece aqui quem mandou a última mensagem e não está sendo atendido pela IA.'
              : 'Troque para "Todas" para ver a fila inteira.'}
          />
        </div>
      ) : (
        <ul className="divide-y divide-surface-700">
          {pag.itens.map((item) => {
            const c = item.conversa
            const dono = c.assignedUser
            const ehMinha = !!dono && dono.id === meuId
            const ocupada = ocupadaId === c.id
            const menuAberto = menuDe === c.id
            // No celular o prazo sobe para a linha do nome: a coluna à parte
            // espremia o nome até "Leonard…".
            const chip = (
              <span
                className={cn(
                  'inline-flex items-center rounded-[6px] font-semibold tabular-nums flex-shrink-0',
                  celular ? 'ml-auto h-5 px-1.5 text-2xs' : 'h-[22px] px-2 text-xs',
                  CHIP_DA_FAIXA[item.faixa],
                )}
                title={`Esperando há ${formatarEspera(item.esperaMin)} · ${ROTULO_DA_FAIXA[item.faixa]}`}
              >
                {formatarEspera(item.esperaMin)}
                <span className="sr-only"> · {ROTULO_DA_FAIXA[item.faixa]}</span>
              </span>
            )
            return (
              <li
                key={c.id}
                className={cn(
                  'group flex items-center gap-3 px-3.5 py-2.5 hover:bg-[var(--rowhover)] transition-colors',
                  ocupada && 'opacity-60 pointer-events-none',
                )}
                data-testid="fila-item"
              >
                <button
                  type="button"
                  onClick={() => onAbrir(item)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-[6px]"
                  aria-label={`Abrir a conversa com ${c.contact.displayName}`}
                >
                  <Avatar name={c.contact.displayName} imageUrl={c.contact.profilePicUrl} size="30" />
                  <span className="flex-1 min-w-0 leading-[1.3]">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-surface-100 truncate">{c.contact.displayName}</span>
                      {/* Mesmo selo de Conversas (D11, SCRUM-1253): pendente sem dono = "Na fila",
                          com ou sem IA na linha (toda a fila é pendente); com dono, o
                          "com Fulano" da linha já diz. */}
                      {c.status === 'pending' && !dono && (
                        // No celular o selo espremia o nome até "C…"; lá o "sem dono" da
                        // 3ª linha já diz o mesmo.
                        celular ? <span className="sr-only">Na fila</span> : (
                          <span className="inline-flex items-center h-5 px-1.5 rounded-[6px] text-2xs font-semibold flex-shrink-0 color-chip-soft border" style={{ ['--chip' as string]: 'var(--color-status-pending)' }}>
                            Na fila
                          </span>
                        )
                      )}
                      {/* Auditoria 12/10: mesma linguagem da lista de Conversas — só o
                          ⚠ na cor de alerta (o chip âmbar "Verificar" se confundia
                          com o "Na fila" ao lado e espremia o nome). */}
                      {c.hasRecentAnomaly && (
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 text-danger flex-shrink-0"
                          title={GUARD_LIST_BADGE_TITLE}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
                          <span className="sr-only">Verificar</span>
                        </span>
                      )}
                      {celular && chip}
                    </span>
                    <span className="block text-xs text-surface-400 truncate">{c.lastMessagePreview || 'Mídia'}</span>
                    {/* Quebra em vez de cortar: no celular "janela fechada · só modelo"
                        empurrava o "sem dono" para fora da linha (SCRUM-1253). */}
                    <span className="flex flex-wrap items-center gap-x-1.5 min-w-0 text-2xs text-surface-500">
                      {item.janela?.state === 'closing' && (
                        <>
                          <span className="inline-flex items-center gap-1 text-status-pending font-semibold flex-shrink-0" title={item.janela.detail}>
                            <Clock className="w-3 h-3" aria-hidden />
                            janela {item.janela.label.toLowerCase()}
                          </span>
                          <span aria-hidden>·</span>
                        </>
                      )}
                      {item.janela?.state === 'closed' && (
                        <>
                          <span className="text-danger font-semibold flex-shrink-0" title={item.janela.detail}>janela fechada · só modelo</span>
                          <span aria-hidden>·</span>
                        </>
                      )}
                      {dono ? (
                        <span className="truncate">com {ehMinha ? 'você' : nomeDe(dono)}</span>
                      ) : (
                        <span className="text-status-pending font-semibold flex-shrink-0">sem dono</span>
                      )}
                      {mostrarLinha && rotuloDaLinha(c) && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="truncate">{rotuloDaLinha(c)}</span>
                        </>
                      )}
                    </span>
                  </span>
                </button>

                {!celular && chip}

                <div className="flex items-center gap-1 flex-shrink-0">
                  {!ehMinha && (
                    <Button
                      size="sm"
                      variant={item.semDono ? 'primary' : 'secondary'}
                      onClick={() => onAssumir(item)}
                      title="Atribuir a você e abrir a conversa"
                    >
                      Assumir
                    </Button>
                  )}
                  <Dropdown
                    open={menuAberto}
                    onClose={() => setMenuDe(null)}
                    align="right"
                    anchor={
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMenuDe(menuAberto ? null : c.id)}
                        aria-haspopup="menu"
                        aria-expanded={menuAberto}
                        aria-label={`Atribuir a conversa com ${c.contact.displayName}`}
                        title="Atribuir a alguém da equipe"
                      >
                        <UserPlus className="w-3.5 h-3.5" aria-hidden />
                        {!celular && <span className="hidden xl:inline">Atribuir</span>}
                        {!celular && <ChevronDown className="hidden xl:inline w-3 h-3 opacity-60" aria-hidden />}
                      </Button>
                    }
                  >
                    <p className="px-2 pt-1 pb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-surface-500">Atribuir a</p>
                    {equipe.length === 0 && (
                      <p className="px-2 pb-2 text-xs text-surface-400">Sem ninguém ativo na equipe.</p>
                    )}
                    {equipe.map((u) => (
                      <DropdownItem
                        key={u.id}
                        active={dono?.id === u.id}
                        onClick={() => { setMenuDe(null); if (dono?.id !== u.id) onAtribuir(item, u.id) }}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', u.isOnline ? 'bg-online' : 'bg-surface-600')} aria-hidden />
                        <span className="flex-1 min-w-0 truncate">{u.id === meuId ? `${nomeDe(u)} (você)` : nomeDe(u)}</span>
                        <span className="text-2xs text-surface-500 tabular-nums">{u.activeConversations} em aberto</span>
                        {dono?.id === u.id && <Check className="w-3.5 h-3.5 text-brand-400" aria-hidden />}
                        <span className="sr-only">{u.isOnline ? ' · online' : ' · offline'}</span>
                      </DropdownItem>
                    ))}
                    {dono && (
                      <>
                        <DropdownSeparator />
                        <DropdownItem onClick={() => { setMenuDe(null); onAtribuir(item, null) }}>Deixar sem dono</DropdownItem>
                      </>
                    )}
                  </Dropdown>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      </div>

      <Paginacao
        pagina={pag.pagina}
        paginas={pag.paginas}
        de={pag.de}
        ate={pag.ate}
        total={pag.total}
        onPagina={onPagina}
        rotulo="conversas esperando alguém"
        className="flex-shrink-0"
      />

      {truncada && (
        <p className="flex-shrink-0 px-3.5 py-2 border-t border-surface-700 text-xs text-surface-500">
          {carregadas !== undefined && totalReal !== undefined && totalReal > carregadas
            ? `A lista mostra ${carregadas} de ${totalReal}: todas as sem dono e as mais recentes com dono. Os números acima são o total.`
            : 'A lista não coube inteira: mostra as mais recentes. Os números acima são o total.'}
        </p>
      )}
    </section>
  )
}
