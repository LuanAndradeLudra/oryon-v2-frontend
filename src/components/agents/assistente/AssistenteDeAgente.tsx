import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Cloud, CloudOff, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import api, { departmentsApi, practitionersApi, productsApi } from '@/services/api'
import { loadHubOrNull } from '@/services/companyContextService'
import {
  createSpecDraft, getAgent, getAgentSpecForAgent, getSpecDraft, getSpecReadiness, listAgents, listAgentTestRuns, podePublicarAgente,
  publishSpecDraft, saveSpecDraft,
  type AgentConfigWithTools, type AgentSpec, type AgentTestRun, type ReadinessItem, type RepeatedFact, type StudySource,
} from '@/services/agentsApi'
import { rodarBateria } from '@/components/agents/bateria/bateria'
import { carregarLinhas, invalidarLinhas } from '@/components/agents/linhasDosAgentes'
import { EtapaNoAr, type LinhaParaEscolher } from './EtapasDoAssistente'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import {
  ETAPAS, ETAPA_ENTREVISTA, ETAPA_EXEMPLOS, ETAPA_TEXTO, completarSpec, faltaNaEtapa, marcarNaoRespondidas, specVazia,
} from './especificacao'
import { EtapaEnsaio, EtapaQuemE } from './EtapasDoAssistente'
import { EtapaEntrevista, EtapaJeitoDeResponder, ParaOndeFoi } from './EtapasDaEntrevista'
import { EtapaEstudar, EtapaOQueJaSei, type FontesDaConta } from './EtapasDeEstudo'

type EstadoSalvo = 'salvando' | 'salvo' | 'sem-servidor'

const chaveRascunho = (tenantId: string | undefined, agentId?: string) =>
  `oryon:agentes:assistente:${tenantId ?? '-'}${agentId ? `:agente:${agentId}` : ''}`

const TIPO_FATO: Record<RepeatedFact['kind'], string> = {
  preco: 'preço', telefone: 'telefone', site: 'site', empresa: 'nome da empresa', endereco: 'endereço',
}

const ENSINO: string[] = [
  'O Oryon lê o que a empresa já tem antes de fazer qualquer pergunta. Nada aqui é sobre IA: é sobre o seu negócio.',
  'Um resumo do negócio montado a partir das fontes. Você só confirma ou corrige; as fontes ficam vinculadas.',
  'Só o que as fontes não responderam, mais o que ele faz sozinho e quando chama a equipe. Fatos vão para a base; jeito de atender, para o texto.',
  'Em vez de escolher um "tom" num rótulo, você reconhece a resposta certa. As escolhidas viram exemplos no texto do agente.',
  'A IA escreve com o que você confirmou e respondeu, e diz o que ainda teve de supor. Fatos (preço, horário, endereço) vêm das fontes.',
  'Teste como um cliente. Os testes ficam salvos e viram casos para conferir a cada mudança.',
  'Publicar é uma operação só: ou o agente fica pronto por inteiro, ou nada muda.',
]

/**
 * Assistente novo (onda 4): 7 etapas sobre o negócio, especificação salva no
 * servidor a cada mudança (recarregar não perde nada) e publicação atômica.
 * Atrás de FF_AGENT_SPEC_WIZARD; o assistente antigo segue como padrão.
 */
export function AssistenteDeAgente({
  onClose, onCreated, agentId, draftInicial,
}: {
  onClose: () => void
  onCreated: (agent: AgentConfigWithTools) => void
  /** Revisar um agente existente: a spec vem dele (a última publicada ou derivada do texto antigo). */
  agentId?: string
  /** Abrir um rascunho específico (ex.: o que um supervisor deixou para um administrador publicar). */
  draftInicial?: string
}) {
  const { user } = useAuth()
  // Decisão do PO (2026-09-29): só administradores colocam no ar; os demais
  // montam o rascunho, que fica salvo para um administrador publicar.
  const podePublicar = podePublicarAgente((user as { role?: string } | null)?.role)
  const [spec, setSpec] = useState<AgentSpec>(specVazia)
  const [etapa, setEtapa] = useState(1)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [salvo, setSalvo] = useState<EstadoSalvo>('salvando')
  const [falta, setFalta] = useState<string | null>(null)
  const [setores, setSetores] = useState<Array<{ id: string; name: string }>>([])
  const [numeros, setNumeros] = useState<LinhaParaEscolher[] | null>(null)
  const [prontidao, setProntidao] = useState<ReadinessItem[] | null>(null)
  const [erroProntidao, setErroProntidao] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [erroPublicar, setErroPublicar] = useState<string | null>(null)
  const carregado = useRef(false)
  const [fatosRepetidos, setFatosRepetidos] = useState<RepeatedFact[]>([])
  // SCRUM-1190 — o que a conta já tem (cadastro, catálogo, profissionais) e o
  // estado das fontes no último estudo.
  const [fontes, setFontes] = useState<FontesDaConta>({ hub: null, catalogo: null, profissionais: null })
  const [fontesLidas, setFontesLidas] = useState<StudySource[] | null>(null)
  const [erroResumo, setErroResumo] = useState<string | null>(null)
  // Revisão: texto ou capacidades editados na página depois da última
  // publicação — publicar por aqui substitui essas edições.
  const [editadoFora, setEditadoFora] = useState<Array<'texto' | 'capacidades'>>([])
  // Depois de publicar, o assistente só fecha quando tudo deu certo. Se algo
  // faltou (linha, fatos, abrir o agente), fica aberto com o que falta e como
  // resolver — o agente JÁ está publicado, e publicar de novo não é o caminho.
  const [publicadoId, setPublicadoId] = useState<string | null>(null)
  const [publicadoSemFatos, setPublicadoSemFatos] = useState(false)
  const [semLinha, setSemLinha] = useState<{ numeroId: string; motivo: string } | null>(null)
  const [semAbrir, setSemAbrir] = useState(false)
  const [religando, setReligando] = useState(false)
  const [abrindo, setAbrindo] = useState(false)
  const rolagem = useRef<HTMLDivElement>(null)

  // Retoma o rascunho aberto (M15) ou cria um no servidor.
  useEffect(() => {
    let vivo = true
    const chave = chaveRascunho(user?.tenantId, agentId)
    const iniciar = async () => {
      let guardado: string | null = draftInicial ?? null
      if (draftInicial) { try { localStorage.setItem(chave, draftInicial) } catch { /* sem storage */ } }
      else { try { guardado = localStorage.getItem(chave) } catch { /* sem storage */ } }
      try {
        if (guardado) {
          // Só "não encontrado" descarta o rascunho guardado. Erro passageiro
          // (rede, servidor fora) não cria outro por cima: fica "não salvo".
          const d = await getSpecDraft(guardado).catch((e: unknown) => {
            if ((e as { status?: number }).status === 404) return null
            throw e
          })
          if (d && !d.published_agent_id && vivo) {
            // Revisão retomada: a edição na página pode ter vindo depois de o
            // rascunho começar — pergunta de novo (não bloqueia a retomada).
            if (agentId) {
              getAgentSpecForAgent(agentId)
                .then((r) => { if (vivo) setEditadoFora(r.editedOutside ?? []) })
                .catch(() => {})
            }
            setSpec(completarSpec(d.spec))
            setEtapa(Math.min(Math.max(d.step, 1), ETAPAS.length))
            setDraftId(d.id)
            setSalvo('salvo')
            carregado.current = true
            return
          }
        }
        const { draft, repeatedFacts, editedOutside } = await createSpecDraft(agentId ? { agentId } : {})
        if (!vivo) return
        if (agentId) {
          setSpec(completarSpec(draft.spec))
          setFatosRepetidos(repeatedFacts)
          setEditadoFora(editedOutside ?? [])
          // Revisão: abre direto no texto do agente.
          setEtapa(ETAPA_TEXTO)
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
    // null = não deu para ler o Contexto da IA; a etapa 1 não grava por cima.
    loadHubOrNull(user?.tenantId).then((hub) => { if (vivo) setFontes((f) => ({ ...f, hub })) }).catch(() => {})
    productsApi.list()
      .then((r) => { if (vivo) setFontes((f) => ({ ...f, catalogo: { count: r.data.length, names: r.data.slice(0, 30).map((p) => p.name) } })) })
      .catch(() => { if (vivo) setFontes((f) => ({ ...f, catalogo: { count: 0, names: [] } })) })
    practitionersApi.list()
      .then((r) => { if (vivo) setFontes((f) => ({ ...f, profissionais: r.data.length })) })
      .catch(() => { if (vivo) setFontes((f) => ({ ...f, profissionais: 0 })) })
    departmentsApi.list().then((r) => { if (vivo) setSetores((r.data ?? []).map((d) => ({ id: d.id, name: d.name }))) }).catch(() => {})
    // Linhas de GET /whatsapp/numbers (traz agentId e não exige administrador;
    // /meta/numbers não traz). O nome do agente de cada linha vem da lista de
    // agentes, para dizer QUEM deixa de atender se a linha for escolhida.
    void Promise.all([carregarLinhas(true), listAgents().catch(() => [])]).then(([linhas, agentes]) => {
      if (!vivo) return
      const nomes = new Map(agentes.map((a) => [a.id, a.name]))
      setNumeros(linhas.map((l) => ({ ...l, agentName: l.agentId ? nomes.get(l.agentId) ?? null : null })))
    })
    return () => { vivo = false }
  }, [user?.tenantId, agentId, draftInicial])

  // Revisão de agente já no ar: a linha certa é a que atende HOJE
  // (whatsapp_numbers.agentId), não a da spec — agente antigo vem sem linha, e
  // a linha pode ter mudado em Configurações → Números depois de publicar.
  const linhaDaRevisao = useRef(false)
  useEffect(() => {
    if (!agentId || !numeros || !draftId || linhaDaRevisao.current) return
    linhaDaRevisao.current = true
    const atual = numeros.find((n) => n.agentId === agentId)?.id ?? null
    setSpec((s) => (s.channel.whatsappNumberId === atual ? s : { ...s, channel: { ...s.channel, whatsappNumberId: atual } }))
  }, [agentId, numeros, draftId])

  // Salva no servidor a cada mudança (com um respiro para não salvar a cada tecla).
  useEffect(() => {
    if (!draftId || !carregado.current) return
    setSalvo('salvando')
    const t = setTimeout(() => {
      saveSpecDraft(draftId, spec, etapa).then(() => setSalvo('salvo')).catch(() => setSalvo('sem-servidor'))
    }, 700)
    return () => clearTimeout(t)
  }, [spec, etapa, draftId])

  // O ensaio compila o rascunho SALVO: grava já, sem esperar o respiro.
  const salvarAgora = useCallback(async () => {
    if (!draftId) return
    await saveSpecDraft(draftId, spec, etapa)
    setSalvo('salvo')
  }, [draftId, spec, etapa])

  const mudar = useCallback((fn: (s: AgentSpec) => AgentSpec) => {
    setFalta(null)
    setSpec((s) => fn(s))
  }, [])

  const carregarProntidao = useCallback(() => {
    if (!draftId) return
    setErroProntidao(false)
    getSpecReadiness(draftId)
      .then((r) => setProntidao(r.items))
      .catch(() => { setProntidao(null); setErroProntidao(true) })
  }, [draftId])

  // Trocar de etapa começa do topo (antes ficava na rolagem da etapa anterior).
  useEffect(() => { rolagem.current?.scrollTo?.({ top: 0 }) }, [etapa])

  const avancar = () => {
    const f = faltaNaEtapa(etapa, spec)
    if (f) { setFalta(f); return }
    // Sair da entrevista: o que ficou sem resposta vira pendência, não some.
    if (etapa === ETAPA_ENTREVISTA) setSpec((s) => marcarNaoRespondidas(s))
    setEtapa((e) => Math.min(e + 1, ETAPAS.length))
  }

  /** Liga a linha ao agente; devolve o motivo da falha, ou null se ligou. */
  const ligarLinha = async (numeroId: string, publicadoId: string): Promise<string | null> => {
    try {
      await api.patch(`/meta/numbers/${numeroId}`, { agentId: publicadoId })
      invalidarLinhas()
      return null
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status
      return status === 403
        ? 'Só um administrador da empresa pode ligar a linha.'
        : 'O servidor não respondeu ao ligar a linha.'
    }
  }

  /** Abre o agente já publicado; se a leitura falhar, fica aqui com "tentar de novo". */
  const abrirPublicado = async (id = publicadoId) => {
    if (!id) return
    setAbrindo(true)
    setSemAbrir(false)
    try {
      onCreated(await getAgent(id))
    } catch {
      setSemAbrir(true)
    } finally {
      setAbrindo(false)
    }
  }

  const tentarLigarDeNovo = async () => {
    if (!semLinha || !publicadoId) return
    setReligando(true)
    const motivo = await ligarLinha(semLinha.numeroId, publicadoId)
    setReligando(false)
    if (motivo) { setSemLinha({ ...semLinha, motivo }); return }
    setSemLinha(null)
    if (!publicadoSemFatos) void abrirPublicado()
  }

  /** Publicar de novo o mesmo rascunho não cria nada: só refaz o envio dos fatos. */
  const reenviarFatos = async () => {
    if (!draftId) return
    setReligando(true)
    try {
      const { factsDoc } = await publishSpecDraft(draftId)
      if (factsDoc === 'error') return
      setPublicadoSemFatos(false)
      if (!semLinha) void abrirPublicado()
    } catch {
      /* segue o aviso; o agente já está publicado */
    } finally {
      setReligando(false)
    }
  }

  const publicar = async () => {
    if (!draftId || publicadoId) return
    setPublicando(true)
    setErroPublicar(null)
    let idPublicado: string | null = null
    try {
      await saveSpecDraft(draftId, spec, etapa)
      const { agentId: novoId, version: versaoPublicada, factsDoc } = await publishSpecDraft(draftId)
      idPublicado = novoId
      setPublicadoId(novoId)
      try { localStorage.removeItem(chaveRascunho(user?.tenantId, agentId)) } catch { /* sem storage */ }
      const numeroId = spec.channel.whatsappNumberId
      const motivoSemLinha = numeroId ? await ligarLinha(numeroId, novoId) : null
      if (motivoSemLinha && numeroId) setSemLinha({ numeroId, motivo: motivoSemLinha })
      // SCRUM-1192 — o agente está no ar, mas os fatos da entrevista não foram
      // para a base: fica aqui para o dono saber e poder reenviar.
      if (factsDoc === 'error') setPublicadoSemFatos(true)
      const publicado = await getAgent(novoId).catch(() => null)
      // Onda 5 (M18) — a bateria de perguntas do ensaio roda em segundo plano
      // a cada publicação; o resultado aparece em Desempenho. Falha aqui não
      // desfaz a publicação.
      if (publicado && spec.tests.some((t) => t.question.trim())) {
        void Promise.resolve()
          .then(() => listAgentTestRuns(novoId))
          .catch(() => [] as AgentTestRun[])
          .then((runs) => rodarBateria({
          agent: publicado, tests: spec.tests, anterior: runs[0] ?? null, trigger: 'publish', specVersion: versaoPublicada,
        })).catch(() => {})
      }
      if (!publicado) { setSemAbrir(true); return }
      if (motivoSemLinha || factsDoc === 'error') return
      onCreated(publicado)
    } catch (e) {
      // Só chega aqui o que falhou ANTES de publicar (salvar, publicar).
      if (!idPublicado) {
        setErroPublicar(e instanceof Error ? e.message : 'Não foi possível publicar. Nada foi alterado.')
        carregarProntidao()
      }
    } finally {
      setPublicando(false)
    }
  }

  const pronto = !!prontidao && prontidao.every((i) => !i.blocking || i.ok)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      role="dialog" aria-modal="true" aria-label={agentId ? 'Revisar agente' : 'Novo agente'}
      className="fixed inset-0 z-50 bg-surface-950"
    >
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
                  <li key={rotulo} aria-current={n === etapa ? 'step' : undefined}>
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

          <div ref={rolagem} className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
              {agentId && editadoFora.length > 0 && (etapa === ETAPA_TEXTO || etapa === 7) && (
                <Banner variant="warning" className="mb-6">
                  {editadoFora.includes('texto') && editadoFora.includes('capacidades')
                    ? 'O texto e as capacidades deste agente foram editados na página'
                    : editadoFora.includes('texto') ? 'O texto deste agente foi editado na página' : 'As capacidades deste agente foram editadas na página'}
                  {' '}depois da última publicação pelo assistente. Esta revisão parte da versão publicada: publicar daqui
                  substitui essas edições.
                </Banner>
              )}
              {etapa === 1 && (
                <EtapaEstudar
                  spec={spec} mudar={mudar} fontes={fontes}
                  onEstudado={(lidas, erroDoResumo) => { setFontesLidas(lidas); setErroResumo(erroDoResumo); setFalta(null); setEtapa(2) }}
                />
              )}
              {etapa === 2 && <EtapaOQueJaSei spec={spec} mudar={mudar} fontes={fontes} fontesLidas={fontesLidas} erroResumo={erroResumo} />}
              {etapa === ETAPA_TEXTO && fatosRepetidos.length > 0 && (
                <Banner variant="warning" className="mb-6">
                  O texto atual repete {fatosRepetidos.length === 1 ? 'um fato que já vem' : 'fatos que já vêm'} das fontes. Tire daqui
                  para não ficar desatualizado quando o cadastro mudar:
                  <ul className="mt-1 list-disc pl-4">
                    {fatosRepetidos.slice(0, 8).map((f) => <li key={`${f.kind}-${f.excerpt}`}>{TIPO_FATO[f.kind]}: {f.excerpt}</li>)}
                  </ul>
                </Banner>
              )}
              {etapa === ETAPA_ENTREVISTA && <EtapaEntrevista spec={spec} mudar={mudar} setores={setores} />}
              {etapa === ETAPA_EXEMPLOS && <EtapaJeitoDeResponder spec={spec} mudar={mudar} />}
              {etapa === ETAPA_TEXTO && <EtapaQuemE spec={spec} mudar={mudar} />}
              {etapa === 6 && <EtapaEnsaio spec={spec} mudar={mudar} draftId={draftId} agentId={agentId} salvarAgora={salvarAgora} />}
              {etapa === 7 && <div className="mb-8"><ParaOndeFoi spec={spec} /></div>}
              {etapa === 7 && (
                <EtapaNoAr spec={spec} mudar={mudar} numeros={numeros ?? []} agentId={agentId} prontidao={prontidao} erroProntidao={erroProntidao} carregarProntidao={carregarProntidao} servidorOk={salvo !== 'sem-servidor' && !!draftId} salvoNoServidor={salvo === 'salvo'} />
              )}
              {etapa === 7 && !podePublicar && !publicadoId && (
                <Banner variant="info" className="mt-6">
                  Só um administrador da empresa pode colocar o agente no ar. O rascunho fica salvo: um administrador
                  encontra em Agentes IA → Rascunhos esperando publicação.
                </Banner>
              )}
              {falta && <Banner variant="warning" className="mt-6">{falta}</Banner>}
              {erroPublicar && <Banner variant="danger" className="mt-6">{erroPublicar}</Banner>}
              {semLinha && (
                <Banner
                  variant="warning"
                  className="mt-6"
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => void tentarLigarDeNovo()} loading={religando} disabled={religando}>Tentar ligar de novo</Button>
                      <Button size="sm" variant="neutral" onClick={() => void abrirPublicado()} loading={abrindo} disabled={religando || abrindo}>Abrir o agente</Button>
                    </div>
                  }
                >
                  O agente foi publicado. Falta só ligar a linha de WhatsApp: {semLinha.motivo} Enquanto isso, ela segue com o
                  atendimento de antes.
                </Banner>
              )}
              {publicadoSemFatos && (
                <Banner
                  variant="warning"
                  className="mt-6"
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => void reenviarFatos()} loading={religando} disabled={religando}>Enviar de novo</Button>
                      <Button size="sm" variant="neutral" onClick={() => void abrirPublicado()} loading={abrindo} disabled={religando || abrindo}>Abrir o agente</Button>
                    </div>
                  }
                >
                  O agente foi publicado, mas as informações da entrevista não foram para a base de conhecimento. Envie de novo,
                  ou abra o agente e adicione em Conhecimento.
                </Banner>
              )}
              {semAbrir && (
                <Banner
                  variant="warning"
                  className="mt-6"
                  action={<Button size="sm" onClick={() => void abrirPublicado()} loading={abrindo} disabled={abrindo}>Tentar abrir de novo</Button>}
                >
                  O agente foi publicado, mas não consegui abri-lo agora. Ele já está salvo; se fechar, ele aparece na lista de agentes.
                </Banner>
              )}
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
              <Button size="md" onClick={() => void publicar()} disabled={!pronto || publicando || !!publicadoId || !podePublicar} loading={publicando}>
                {agentId ? 'Publicar nova versão' : 'Publicar agente'}
              </Button>
            )}
          </footer>
        </main>
      </div>
    </motion.div>
  )
}
