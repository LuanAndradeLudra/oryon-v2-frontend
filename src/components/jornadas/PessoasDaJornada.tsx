import { useMemo, useState } from 'react'
import { Search, UserMinus, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Drawer } from '@/components/ui/Drawer'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { passoDoCatalogo } from '@/services/jornadas/catalogo'
import type { Catalogo, Inscricao, Jornada, VerificacaoDeEntrada } from '@/services/jornadas/tipos'
import { Selo, SeloDaInscricao } from './comum'
import { dataHora, quandoFoi, useCarregar } from './apoio'

/**
 * Pessoas: quem está em cada passo e por quê, a linha do tempo de cada
 * inscrição e o "por que não entrou" (modelado no "Detalhes da verificação").
 */

type Filtro = 'dentro' | 'encerradas' | 'todas'

export function PessoasDaJornada({ jornada, catalogo }: { jornada: Jornada; catalogo: Catalogo }) {
  const [filtro, setFiltro] = useState<Filtro>('dentro')
  const [aberta, setAberta] = useState<Inscricao | null>(null)
  const { dados: inscricoes, recarregar } = useCarregar(() => jornadasApi.inscricoes(jornada.id), [jornada.id])

  const visiveis = useMemo(() => (inscricoes ?? []).filter((i) =>
    filtro === 'todas' ? true : filtro === 'dentro' ? i.status === 'active' || i.status === 'waiting' : !(i.status === 'active' || i.status === 'waiting')), [inscricoes, filtro])
  const nomeDoPasso = (id: string | null) => {
    if (!id) return '—'
    const no = jornada.draft.graph.nodes[id]
    return no ? no.label || passoDoCatalogo(catalogo, no.type)?.label || no.type : '—'
  }

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 md:px-8 py-6 space-y-6">
      <PorQueNaoEntrou jornada={jornada} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold text-surface-50">Pessoas na jornada</h2>
            <p className="mt-0.5 text-[12.5px] text-surface-400">Clique numa pessoa para ver, passo a passo, o que aconteceu e por quê.</p>
          </div>
          <SegmentedControl label="Quais inscrições" value={filtro} onChange={setFiltro} options={[
            { value: 'dentro', label: 'Dentro agora' },
            { value: 'encerradas', label: 'Encerradas' },
            { value: 'todas', label: 'Todas' },
          ]} />
        </div>
        {!inscricoes && <div className="space-y-2">{[0, 1, 2].map((i) => <SkeletonCard key={i} lines={1} />)}</div>}
        {inscricoes && visiveis.length === 0 && <EmptyState icon={Users} title="Ninguém aqui" hint={jornada.status === 'draft' ? 'A jornada ainda não foi publicada.' : 'Nenhuma inscrição neste filtro.'} />}
        {inscricoes && visiveis.length > 0 && (
          <div className="overflow-x-auto rounded-[12px] border border-surface-700">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 bg-surface-900">
                  <th className="font-semibold px-4 h-10">Pessoa</th>
                  <th className="font-semibold px-4 h-10">Assunto</th>
                  <th className="font-semibold px-4 h-10">Onde está</th>
                  <th className="font-semibold px-4 h-10">Situação</th>
                  <th className="font-semibold px-4 h-10">Entrou</th>
                  <th className="font-semibold px-4 h-10">Próximo passo</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((i) => (
                  <tr key={i.id} onClick={() => setAberta(i)} className="border-t border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)] cursor-pointer">
                    <td className="px-4 py-3">
                      <button type="button" className="text-left focus-visible:outline-none focus-visible:underline" onClick={(e) => { e.stopPropagation(); setAberta(i) }}>
                        <span className="block font-medium text-surface-50">{i.contact.name}</span>
                        <span className="block text-[11px] text-surface-500">{i.contact.phoneMasked}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-300">{i.subjectLabel}</td>
                    <td className="px-4 py-3 text-xs text-surface-200">{i.currentNodeId ? nomeDoPasso(i.currentNodeId) : <span className="text-surface-500">saiu</span>}<span className="ml-1.5 text-[10.5px] text-surface-500">v{i.version}</span></td>
                    <td className="px-4 py-3"><SeloDaInscricao status={i.status} shadow={i.shadow} /></td>
                    <td className="px-4 py-3 text-xs text-surface-400 tabular-nums">{quandoFoi(i.enteredAt)}</td>
                    <td className="px-4 py-3 text-xs text-surface-400 tabular-nums">{i.nextWakeAt ? quandoFoi(i.nextWakeAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <LinhaDoTempo jornada={jornada} inscricao={aberta} onClose={() => setAberta(null)} onTirada={() => { setAberta(null); void recarregar() }} />
    </div>
  )
}

function LinhaDoTempo({ jornada, inscricao, onClose, onTirada }: { jornada: Jornada; inscricao: Inscricao | null; onClose: () => void; onTirada: () => void }) {
  const { toast } = useToast()
  const [confirmar, setConfirmar] = useState(false)
  const { dados: itens } = useCarregar(() => (inscricao ? jornadasApi.linhaDoTempo(jornada.id, inscricao.id) : Promise.resolve([])), [inscricao?.id])
  const dentro = inscricao && (inscricao.status === 'active' || inscricao.status === 'waiting')

  return (
    <Drawer open={!!inscricao} onClose={onClose} side="right" className="w-[440px]" ariaLabel="Linha do tempo da inscrição">
      {inscricao && (
        <div className="flex flex-col h-full">
          <div className="flex items-start gap-2 border-b border-surface-700 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-50">{inscricao.contact.name}</p>
              <p className="text-xs text-surface-400">{inscricao.subjectLabel} · v{inscricao.version}</p>
              <div className="mt-1.5"><SeloDaInscricao status={inscricao.status} shadow={inscricao.shadow} /></div>
            </div>
            <Button variant="ghost" size="sm" iconOnly aria-label="Fechar" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
          <ol className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {!itens && <li className="text-xs text-surface-400">Carregando…</li>}
            {(itens ?? []).map((it, i) => (
              <li key={i} className="flex gap-2.5">
                <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', it.status === 'waiting' ? 'bg-status-pending' : it.status === 'failed' ? 'bg-[var(--color-danger)]' : it.status === 'shadow' ? 'bg-[var(--color-accent-violet)]' : 'bg-surface-500')} aria-hidden />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-surface-100">{it.title}<span className="ml-2 text-[11px] font-normal text-surface-500 tabular-nums">{dataHora(it.at)}</span></p>
                  <p className="text-xs text-surface-400 leading-relaxed">{it.detail}</p>
                  {it.reason && <p className="mt-1 text-[11px] text-surface-500">Por quê: {it.reason}</p>}
                  {it.status === 'shadow' && <p className="mt-1 text-[11px] text-[color-mix(in_srgb,var(--color-accent-violet)_80%,var(--color-surface-50))]">Em sombra: não foi enviado de verdade.</p>}
                </div>
              </li>
            ))}
          </ol>
          {dentro && (
            <div className="border-t border-surface-700 px-4 py-3">
              <Button variant="secondary" size="sm" leftIcon={<UserMinus className="w-4 h-4" />} onClick={() => setConfirmar(true)}>Tirar da jornada</Button>
            </div>
          )}
          <ConfirmModal
            open={confirmar}
            onClose={() => setConfirmar(false)}
            onConfirm={async () => {
              await jornadasApi.tirarDaJornada(jornada.id, inscricao.id)
              setConfirmar(false)
              toast(`${inscricao.contact.name} saiu da jornada. Nenhuma mensagem a mais.`, 'success')
              onTirada()
            }}
            title="Tirar da jornada?"
            description="A pessoa sai na hora, com o motivo 'manual', e não recebe mais nada desta jornada."
            confirmLabel="Tirar"
          />
        </div>
      )}
    </Drawer>
  )
}

const ROTULO_DO_RESULTADO: Record<VerificacaoDeEntrada['result'], [string, 'verde' | 'cinza' | 'ambar' | 'vermelho' | 'violeta']> = {
  entered: ['Entrou', 'verde'],
  filtered: ['Barrado pelo filtro', 'ambar'],
  reentry_blocked: ['Já estava inscrito', 'cinza'],
  suppressed: ['Suprimido', 'violeta'],
  no_contact: ['Sem contato', 'vermelho'],
  journey_paused: ['Jornada pausada', 'cinza'],
}

function PorQueNaoEntrou({ jornada }: { jornada: Jornada }) {
  const [busca, setBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof jornadasApi.porQueNaoEntrou>> | undefined>(undefined)

  const procurar = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!busca.trim()) return
    setBuscando(true)
    try { setResultado(await jornadasApi.porQueNaoEntrou(jornada.id, busca)) } finally { setBuscando(false) }
  }

  return (
    <section className="rounded-[12px] border border-surface-700 bg-surface-800 px-5 py-4 space-y-3">
      <div>
        <h2 className="text-[15px] font-semibold text-surface-50">Por que não entrou?</h2>
        <p className="mt-0.5 text-[12.5px] text-surface-400">Busque um contato e veja, em cada porta, o que aconteceu nos últimos 14 dias.</p>
      </div>
      <form onSubmit={procurar} className="flex gap-2 max-w-[520px]">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" aria-hidden />
          <Input size="sm" className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou telefone com DDD" aria-label="Buscar contato" />
        </div>
        <Button size="sm" type="submit" loading={buscando}>Ver</Button>
      </form>
      {resultado === null && <p className="text-[12.5px] text-surface-400">Nenhuma passagem desse contato pelas portas desta jornada nos últimos 14 dias.</p>}
      {resultado && (
        <div className="space-y-2">
          <p className="text-xs text-surface-300"><strong className="text-surface-100">{resultado.contact.name}</strong> · {resultado.contact.phoneMasked}</p>
          <ul className="space-y-1.5">
            {resultado.checks.map((c, i) => {
              const [rotulo, tom] = ROTULO_DO_RESULTADO[c.result]
              return (
                <li key={i} className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-[8px] bg-surface-900 px-3 py-2">
                  <Selo tom={tom}>{rotulo}</Selo>
                  <span className="text-xs text-surface-200">{c.reason}</span>
                  <span className="ml-auto text-[11px] text-surface-500 tabular-nums">{c.doorLabel} · {dataHora(c.at)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
