import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Cloud, CloudOff, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import api, { departmentsApi, whatsappNumbersApi } from '@/services/api'
import {
  createSpecDraft, getAgent, getSpecDraft, getSpecReadiness, publishSpecDraft, saveSpecDraft,
  type AgentConfigWithTools, type AgentSpec, type ReadinessItem, type RepeatedFact,
} from '@/services/agentsApi'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { ETAPAS, faltaNaEtapa, specVazia } from './especificacao'
import {
  EtapaEnsaio, EtapaNoAr, EtapaPodeFazer, EtapaPontoDePartida, EtapaQuemE, EtapaSabe, EtapaTransferencia,
} from './EtapasDoAssistente'

type EstadoSalvo = 'salvando' | 'salvo' | 'sem-servidor'

const chaveRascunho = (tenantId: string | undefined, agentId?: string) =>
  `oryon:agentes:assistente:${tenantId ?? '-'}${agentId ? `:agente:${agentId}` : ''}`

const TIPO_FATO: Record<RepeatedFact['kind'], string> = {
  preco: 'preço', telefone: 'telefone', site: 'site', empresa: 'nome da empresa', endereco: 'endereço',
}

const ENSINO: string[] = [
  'Tudo que você responder aqui vira a especificação do agente. Nada é sobre IA: é sobre o seu negócio.',
  'A IA escreve só a personalidade e o jeito de conduzir. Fatos (preço, horário, endereço) vêm das fontes, não do texto.',
  'Cada ação marcada é uma ferramenta de verdade. O que não tiver ferramenta, o agente explica e passa para a equipe.',
  'As fontes ficam vinculadas: mudou o cadastro da empresa ou o catálogo, o agente já sabe.',
  'Estas situações viram regras que transferem antes da IA responder, e a IA fica pausada enquanto a equipe atende.',
  'Teste como um cliente. Os testes ficam salvos e viram casos para conferir a cada mudança.',
  'Publicar é uma operação só: ou o agente fica pronto por inteiro, ou nada muda.',
]

/**
 * Assistente novo (onda 4): 7 etapas sobre o negócio, especificação salva no
 * servidor a cada mudança (recarregar não perde nada) e publicação atômica.
 * Atrás de FF_AGENT_SPEC_WIZARD; o assistente antigo segue como padrão.
 */
export function AssistenteDeAgente({
  onClose, onCreated, agentId,
}: {
  onClose: () => void
  onCreated: (agent: AgentConfigWithTools) => void
  /** Revisar um agente existente: a spec vem dele (a última publicada ou derivada do texto antigo). */
  agentId?: string
}) {
  const { user } = useAuth()
  const [spec, setSpec] = useState<AgentSpec>(specVazia)
  const [etapa, setEtapa] = useState(1)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [salvo, setSalvo] = useState<EstadoSalvo>('salvando')
  const [falta, setFalta] = useState<string | null>(null)
  const [setores, setSetores] = useState<Array<{ id: string; name: string }>>([])
  const [numeros, setNumeros] = useState<Array<{ id: string; displayPhoneNumber: string; label?: string; agentId?: string | null }>>([])
  const [prontidao, setProntidao] = useState<ReadinessItem[] | null>(null)
  const [publicando, setPublicando] = useState(false)
  const [erroPublicar, setErroPublicar] = useState<string | null>(null)
  const carregado = useRef(false)
  const [fatosRepetidos, setFatosRepetidos] = useState<RepeatedFact[]>([])

  // Retoma o rascunho aberto (M15) ou cria um no servidor.
  useEffect(() => {
    let vivo = true
    const chave = chaveRascunho(user?.tenantId, agentId)
    const iniciar = async () => {
      let guardado: string | null = null
      try { guardado = localStorage.getItem(chave) } catch { /* sem storage */ }
      try {
        if (guardado) {
          const d = await getSpecDraft(guardado).catch(() => null)
          if (d && !d.published_agent_id && vivo) {
            setSpec(d.spec)
            setEtapa(Math.min(Math.max(d.step, 1), ETAPAS.length))
            setDraftId(d.id)
            setSalvo('salvo')
            carregado.current = true
            return
          }
        }
        const { draft, repeatedFacts } = await createSpecDraft(agentId ? { agentId } : {})
        if (!vivo) return
        if (agentId) {
          setSpec(draft.spec)
          setFatosRepetidos(repeatedFacts)
          // Revisão: o texto do agente mora na etapa 2.
          setEtapa(2)
        }
        setDraftId(draft.id)
        setSalvo('salvo')
        try { localStorage.setItem(chave, draft.id) } catch { /* sem storage */ }
      } catch {
        if (vivo) setSalvo('sem-servidor')
      } finally {
        carregado.current = true
      }
    }
    void iniciar()
    departmentsApi.list().then((r) => { if (vivo) setSetores((r.data ?? []).map((d) => ({ id: d.id, name: d.name }))) }).catch(() => {})
    whatsappNumbersApi.list().then((r) => {
      if (vivo) setNumeros((r.data ?? []).map((n) => ({ id: n.id, displayPhoneNumber: n.displayPhoneNumber, label: n.label, agentId: (n as { agentId?: string | null }).agentId ?? null })))
    }).catch(() => {})
    return () => { vivo = false }
  }, [user?.tenantId, agentId])

  // Salva no servidor a cada mudança (com um respiro para não salvar a cada tecla).
  useEffect(() => {
    if (!draftId || !carregado.current) return
    setSalvo('salvando')
    const t = setTimeout(() => {
      saveSpecDraft(draftId, spec, etapa).then(() => setSalvo('salvo')).catch(() => setSalvo('sem-servidor'))
    }, 700)
    return () => clearTimeout(t)
  }, [spec, etapa, draftId])

  const mudar = useCallback((fn: (s: AgentSpec) => AgentSpec) => {
    setFalta(null)
    setSpec((s) => fn(s))
  }, [])

  const carregarProntidao = useCallback(() => {
    if (!draftId) return
    getSpecReadiness(draftId).then((r) => setProntidao(r.items)).catch(() => setProntidao(null))
  }, [draftId])

  const avancar = () => {
    const f = faltaNaEtapa(etapa, spec)
    if (f) { setFalta(f); return }
    setEtapa((e) => Math.min(e + 1, ETAPAS.length))
  }

  const publicar = async () => {
    if (!draftId) return
    setPublicando(true)
    setErroPublicar(null)
    try {
      await saveSpecDraft(draftId, spec, etapa)
      const { agentId: publicadoId } = await publishSpecDraft(draftId)
      if (spec.channel.whatsappNumberId) {
        await api.patch(`/meta/numbers/${spec.channel.whatsappNumberId}`, { agentId: publicadoId }).catch(() => {
          setErroPublicar('O agente foi publicado, mas não deu para ligar o número. Ligue em Configurações → WhatsApp.')
        })
      }
      try { localStorage.removeItem(chaveRascunho(user?.tenantId, agentId)) } catch { /* sem storage */ }
      onCreated(await getAgent(publicadoId))
    } catch (e) {
      setErroPublicar(e instanceof Error ? e.message : 'Não foi possível publicar. Nada foi alterado.')
      carregarProntidao()
    } finally {
      setPublicando(false)
    }
  }

  const pronto = !!prontidao && prontidao.every((i) => !i.blocking || i.ok)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 bg-surface-950">
      <div className="flex h-full overflow-hidden">
        <aside className="hidden w-80 flex-shrink-0 flex-col border-r border-surface-700 bg-surface-800 md:flex">
          <div className="flex-1 overflow-y-auto px-5 py-[18px]">
            <p className="text-xs text-surface-400">{agentId ? 'Revisar agente' : 'Novo agente'}</p>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[.14em] text-accent-dark">Etapa {etapa} de {ETAPAS.length}</p>
            <h2 className="mt-1.5 text-[18px] font-bold leading-[1.25] text-surface-100">{ETAPAS[etapa - 1]}</h2>
            <p className="mt-2 text-[12.5px] leading-[1.55] text-surface-400">{ENSINO[etapa - 1]}</p>
            <ol className="mt-6 flex flex-col gap-0.5">
              {ETAPAS.map((rotulo, i) => {
                const n = i + 1
                const feita = n < etapa
                return (
                  <li key={rotulo}>
                    <button
                      type="button"
                      disabled={!feita}
                      onClick={() => setEtapa(n)}
                      className={cn('flex h-[30px] w-full items-center gap-2.5 rounded-sm text-left text-[12.5px]', feita && 'hover:bg-[var(--rowhover)]')}
                    >
                      <span className={cn(
                        'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border',
                        feita && 'border-transparent bg-accent-soft text-accent-dark',
                        n === etapa && 'border-transparent bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)]',
                        !feita && n !== etapa && 'border-surface-600 text-surface-500',
                      )}>
                        {feita ? <Check className="h-3 w-3" strokeWidth={3} /> : <span className="text-[10px] font-bold">{n}</span>}
                      </span>
                      <span className={n === etapa ? 'font-semibold text-surface-100' : feita ? 'text-surface-400' : 'text-surface-500'}>{rotulo}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-shrink-0 items-center gap-3 border-b border-surface-700 bg-surface-800 px-4 py-3 md:px-6">
            <div className="min-w-0 flex-1 md:hidden">
              <p className="text-3xs font-bold uppercase tracking-[.14em] text-accent-dark">Etapa {etapa} de {ETAPAS.length}</p>
              <p className="truncate text-base font-bold text-surface-100">{ETAPAS[etapa - 1]}</p>
            </div>
            <div className="hidden flex-1 items-center gap-1 md:flex">
              {ETAPAS.map((_, i) => <div key={i} className={cn('h-[3px] flex-1 rounded-[2px]', i < etapa ? 'bg-brand-500' : 'bg-surface-700')} />)}
            </div>
            <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-surface-400" aria-live="polite">
              {salvo === 'salvando' && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando</>}
              {salvo === 'salvo' && <><Cloud className="h-3.5 w-3.5" /> Rascunho salvo</>}
              {salvo === 'sem-servidor' && <><CloudOff className="h-3.5 w-3.5 text-danger" /> Não salvo no servidor</>}
            </span>
            <Button variant="ghost" size="md" iconOnly aria-label="Fechar" onClick={onClose} disabled={publicando}>
              <X className="h-5 w-5" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
              {etapa === 1 && <EtapaPontoDePartida spec={spec} mudar={mudar} />}
              {etapa === 2 && fatosRepetidos.length > 0 && (
                <Banner variant="warning" className="mb-6">
                  O texto atual repete {fatosRepetidos.length === 1 ? 'um fato que já vem' : 'fatos que já vêm'} das fontes. Tire daqui
                  para não ficar desatualizado quando o cadastro mudar:
                  <ul className="mt-1 list-disc pl-4">
                    {fatosRepetidos.slice(0, 8).map((f) => <li key={`${f.kind}-${f.excerpt}`}>{TIPO_FATO[f.kind]}: {f.excerpt}</li>)}
                  </ul>
                </Banner>
              )}
              {etapa === 2 && <EtapaQuemE spec={spec} mudar={mudar} />}
              {etapa === 3 && <EtapaPodeFazer spec={spec} mudar={mudar} />}
              {etapa === 4 && <EtapaSabe spec={spec} mudar={mudar} />}
              {etapa === 5 && <EtapaTransferencia spec={spec} mudar={mudar} setores={setores} />}
              {etapa === 6 && <EtapaEnsaio spec={spec} mudar={mudar} />}
              {etapa === 7 && (
                <EtapaNoAr spec={spec} mudar={mudar} numeros={numeros} prontidao={prontidao} carregarProntidao={carregarProntidao} servidorOk={salvo !== 'sem-servidor' && !!draftId} />
              )}
              {falta && <Banner variant="warning" className="mt-6">{falta}</Banner>}
              {erroPublicar && <Banner variant="danger" className="mt-6">{erroPublicar}</Banner>}
            </div>
          </div>

          <footer className="flex flex-shrink-0 items-center gap-2 border-t border-surface-700 bg-surface-800 px-4 py-3 md:px-6">
            <Button variant="neutral" size="md" onClick={() => setEtapa((e) => Math.max(e - 1, 1))} disabled={etapa === 1 || publicando}>
              Voltar
            </Button>
            <div className="flex-1" />
            {etapa < ETAPAS.length ? (
              <Button size="md" onClick={avancar}>Continuar</Button>
            ) : (
              <Button size="md" onClick={() => void publicar()} disabled={!pronto || publicando} loading={publicando}>
                {agentId ? 'Publicar nova versão' : 'Publicar agente'}
              </Button>
            )}
          </footer>
        </main>
      </div>
    </motion.div>
  )
}
