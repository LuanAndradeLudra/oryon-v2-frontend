import { ChevronRight, Flag } from 'lucide-react'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { useDadosDoSuporte, useSuporte } from './suporteDaConversa'
import { useMarcacao } from './marcacaoDoChamado'
import { PrioridadeDaEmpresaChip, StatusChip } from './SupportChip'
import { dataCurta, emAberto, tituloDoChamado } from './supportModel'

/**
 * Seção "Chamados" do painel do contato — o que está LIGADO à conversa mora no
 * painel (padrão de Intercom/Front), e o cabeçalho fica só com quem cuida e o
 * estado. Daqui sai também o "Abrir chamado", que liga a marcação de mensagens.
 *
 * `aoAbrirNoCelular`: no celular o painel do contato cobre o chat; ao começar
 * a marcar, ele precisa sair da frente (quem fecha é a página).
 */
export function SupportPanelSection({ aoAbrirNoCelular }: { aoAbrirNoCelular?: () => void }) {
  const s = useSuporte()
  const d = useDadosDoSuporte()
  const marcando = useMarcacao(s.store, (e) => e.marcando)
  if (!s.ligado || !d) return null
  const abrir = () => {
    s.iniciarMarcacao()
    if (!s.emPainel) aoAbrirNoCelular?.()
  }
  const abertos = d.chamados.filter(emAberto).length
  return (
    <CollapsibleSection
      title={`Chamados · ${d.chamados.length}`}
      storageKey="conv-panel.support"
      className="border-t border-surface-700"
      actions={
        <button type="button" onClick={abrir} disabled={marcando} className="text-xs font-semibold text-accent-dark hover:underline disabled:opacity-50 disabled:no-underline">
          Abrir chamado
        </button>
      }
    >
      {d.erro ? (
        <p className="text-xs text-surface-400" role="alert">
          Não foi possível carregar os chamados.{' '}
          <button type="button" onClick={d.recarregar} className="font-semibold text-accent-dark hover:underline">Tentar de novo</button>
        </p>
      ) : d.carregando && d.chamados.length === 0 ? (
        <p className="text-xs text-surface-400" role="status">Carregando chamados…</p>
      ) : d.chamados.length === 0 ? (
        <p className="text-xs text-surface-400">
          Algo errado nesta conversa?{' '}
          <button type="button" onClick={abrir} disabled={marcando} className="font-semibold text-accent-dark hover:underline disabled:opacity-50">Abrir chamado</button>
          {' '}e marque as mensagens. O contexto vai junto.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {abertos > 0 && <p className="text-[11px] text-surface-400">{abertos} {abertos > 1 ? 'abertos' : 'aberto'} com a equipe Oryon</p>}
          {d.chamados.map((c) => {
            const n = c.mensagensMarcadas?.length ?? 0
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => s.irParaChamado(c.id)}
                aria-label={`${c.numero} · ${tituloDoChamado(c)} · ver andamento`}
                className="group w-full text-left rounded-[8px] border border-surface-700 px-2.5 py-2 flex flex-col gap-1 hover:bg-[var(--rowhover)] transition-colors"
              >
                <span className="flex items-center gap-1.5 flex-wrap">
                  <Flag className="w-3 h-3 text-warning flex-shrink-0" aria-hidden />
                  <span className="font-mono text-[11px] text-surface-300">{c.numero}</span>
                  <StatusChip status={c.status} />
                  <PrioridadeDaEmpresaChip prioridade={c.prioridade} />
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-surface-500 group-hover:text-surface-200" aria-hidden />
                </span>
                <span className="text-xs font-semibold text-surface-100 truncate">{tituloDoChamado(c)}</span>
                <span className="text-[11px] text-surface-400">
                  {n ? `${n} ${n === 1 ? 'mensagem marcada' : 'mensagens marcadas'}` : 'a conversa como um todo'} · {dataCurta(c.atualizadoEm)}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </CollapsibleSection>
  )
}
