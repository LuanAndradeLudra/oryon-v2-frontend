import { useEffect, useState } from 'react'
import { Check, HelpCircle, Loader2, RefreshCw, Send, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  chatWithAgent, generateSpecText, type AgentSpec, type CrmCapabilityId, type HandoffSituation, type ReadinessItem,
} from '@/services/agentsApi'
import { CRM_CAPABILITIES_CATALOG } from '@/components/agents/crmCapabilitiesCatalog'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { PERGUNTAS_DE_ENSAIO, SITUACOES, TONS, textoParaEnsaio } from './especificacao'

type Mudar = (fn: (s: AgentSpec) => AgentSpec) => void

function Opcao({ ativa, onClick, titulo, descricao }: { ativa: boolean; onClick: () => void; titulo: string; descricao?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
        ativa ? 'border-brand-500 bg-accent-soft' : 'border-surface-700 hover:border-surface-600',
      )}
    >
      <span className={cn('mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border', ativa ? 'border-brand-500 bg-brand-500 text-white' : 'border-surface-600')}>
        {ativa && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-surface-100">{titulo}</span>
        {descricao && <span className="mt-0.5 block text-xs text-surface-400">{descricao}</span>}
      </span>
    </button>
  )
}

// ── 3. Quem é o agente ───────────────────────────────────────────────────────

export function EtapaQuemE({ spec, mudar }: { spec: AgentSpec; mudar: Mudar }) {
  const [gerando, setGerando] = useState(false)
  const [avisos, setAvisos] = useState<string[]>([])
  const [erro, setErro] = useState<string | null>(null)
  // SCRUM-1190 — o que a IA precisou supor, com a pergunta que resolve.
  const [suposicoes, setSuposicoes] = useState<Array<{ text: string; question: string }>>([])
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const escrever = async (base: AgentSpec = spec) => {
    setGerando(true)
    setErro(null)
    try {
      const r = await generateSpecText(base)
      mudar((s) => ({ ...s, persona: { ...s.persona, text: r.persona }, flow: { text: r.flow } }))
      setAvisos(r.warnings)
      setSuposicoes(r.assumptions ?? [])
      setRespostas({})
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'A IA não conseguiu escrever agora.')
    } finally {
      setGerando(false)
    }
  }
  const respondidas = suposicoes.filter((q) => respostas[q.question]?.trim())
  const refazer = () => {
    // As respostas ficam na especificação: valem para as próximas gerações também.
    const novas = respondidas.map((q) => ({ question: q.question, answer: respostas[q.question].trim() }))
    const answers = [...spec.context.answers.filter((a) => !novas.some((n) => n.question === a.question)), ...novas]
    const proxima = { ...spec, context: { ...spec.context, answers } }
    mudar((s) => ({ ...s, context: { ...s.context, answers } }))
    void escrever(proxima)
  }
  return (
    <div className="space-y-6">
      <FormField label="Nome do agente">
        <Input value={spec.identity.name} onChange={(e) => mudar((s) => ({ ...s, identity: { ...s.identity, name: e.target.value } }))} placeholder="Ex.: Serrinha" />
      </FormField>
      <div>
        <p className="mb-2 text-sm font-medium text-surface-200">Como ele fala</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TONS.map((t) => (
            <Opcao key={t.id} ativa={spec.persona.tone === t.id} onClick={() => mudar((s) => ({ ...s, persona: { ...s.persona, tone: t.id } }))} titulo={t.rotulo} descricao={`“${t.exemplo}”`} />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="neutral" size="sm" leftIcon={gerando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} onClick={() => void escrever()} disabled={gerando}>
          {spec.persona.text ? 'Reescrever com IA' : 'Escrever com IA'}
        </Button>
        <span className="text-xs text-surface-500">A IA escreve só quem ele é e como conduz. Preços, horários e endereço vêm das fontes.</span>
      </div>
      {erro && (
        <Banner variant="danger">
          <span className="block">{erro}</span>
          <span className="block">Você pode escrever os textos abaixo.</span>
        </Banner>
      )}
      {avisos.length > 0 && (
        <Banner variant="warning">
          {avisos.map((a) => <span key={a} className="block">{a}</span>)}
        </Banner>
      )}
      {suposicoes.length > 0 && (
        <section aria-labelledby="suposicoes-titulo" className="rounded-lg border border-surface-700 p-4">
          <h3 id="suposicoes-titulo" className="flex items-center gap-2 text-sm font-semibold text-surface-100">
            <HelpCircle className="h-4 w-4 text-status-pending" aria-hidden /> O que a IA precisou supor
          </h3>
          <p className="mt-1 text-xs text-surface-400">Responda e o texto é refeito. Deixe em branco para manter a suposição.</p>
          <ul className="mt-3 space-y-3">
            {suposicoes.map((q) => (
              <li key={q.question} className="space-y-1.5">
                <p className="text-sm text-surface-200">{q.text}</p>
                <Input
                  aria-label={q.question}
                  placeholder={q.question}
                  value={respostas[q.question] ?? ''}
                  onChange={(e) => setRespostas((r) => ({ ...r, [q.question]: e.target.value }))}
                />
              </li>
            ))}
          </ul>
          <Button
            className="mt-3" size="sm" variant="neutral" onClick={refazer} disabled={gerando || respondidas.length === 0}
            leftIcon={gerando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          >
            Refazer com as respostas
          </Button>
        </section>
      )}
      <FormField label="Quem é o agente" hint="Personalidade e jeito de atender. Sem preços, endereço ou horários.">
        <Textarea rows={5} value={spec.persona.text} onChange={(e) => mudar((s) => ({ ...s, persona: { ...s.persona, text: e.target.value } }))} />
      </FormField>
      <FormField label="Como ele conduz a conversa" hint="Os passos, do cumprimento ao fechamento.">
        <Textarea rows={7} value={spec.flow.text} onChange={(e) => mudar((s) => ({ ...s, flow: { text: e.target.value } }))} />
      </FormField>
    </div>
  )
}

// ── 4. O que ele pode fazer ──────────────────────────────────────────────────

export function EtapaPodeFazer({ spec, mudar }: { spec: AgentSpec; mudar: Mudar }) {
  const ligada = (id: CrmCapabilityId) => spec.capabilities.some((c) => c.id === id)
  const alternar = (id: CrmCapabilityId) => mudar((s) => ({
    ...s,
    capabilities: ligada(id) ? s.capabilities.filter((c) => c.id !== id) : [...s.capabilities, { id }],
  }))
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-surface-700 rounded-lg border border-surface-700">
        {CRM_CAPABILITIES_CATALOG.map((c) => (
          <li key={c.id} className="flex items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-surface-100">{c.label}</p>
              <p className="mt-0.5 text-xs text-surface-400">{c.description}</p>
              <p className="mt-1 text-2xs font-semibold text-status-active">Pronta</p>
            </div>
            <Switch checked={ligada(c.id)} onChange={() => alternar(c.id)} />
          </li>
        ))}
      </ul>
      <Banner variant="info">
        Agendar, consultar sistemas e outras integrações precisam ser conectadas depois de publicar (seção Capacidades do
        agente). Sem ferramenta, o agente explica e chama uma pessoa — não promete o que não consegue fazer.
      </Banner>
    </div>
  )
}

// ── 5. Quando chamar uma pessoa ──────────────────────────────────────────────

export function EtapaTransferencia({ spec, mudar, setores }: { spec: AgentSpec; mudar: Mudar; setores: Array<{ id: string; name: string }> }) {
  const marcada = (id: HandoffSituation) => spec.handoff.situations.includes(id)
  const alternar = (id: HandoffSituation) => mudar((s) => ({
    ...s,
    handoff: { ...s.handoff, situations: marcada(id) ? s.handoff.situations.filter((x) => x !== id) : [...s.handoff.situations, id] },
  }))
  return (
    <div className="space-y-6">
      <div className="grid gap-2">
        {SITUACOES.map((s) => (
          <Opcao key={s.id} ativa={marcada(s.id)} onClick={() => alternar(s.id)} titulo={s.rotulo} descricao={s.descricao} />
        ))}
      </div>
      <FormField label="Setor que recebe" hint="Por enquanto informativo: a conversa vai para a fila da equipe.">
        <Select value={spec.handoff.sectorName ?? ''} onChange={(e) => mudar((s) => ({ ...s, handoff: { ...s.handoff, sectorName: e.target.value || null } }))}>
          <option value="">Qualquer pessoa da equipe</option>
          {setores.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
        </Select>
      </FormField>
      <FormField label="Mensagem ao transferir" hint="Deixe vazio para a frase padrão.">
        <Input value={spec.handoff.message ?? ''} onChange={(e) => mudar((s) => ({ ...s, handoff: { ...s.handoff, message: e.target.value || null } }))} placeholder="Vou chamar uma pessoa da nossa equipe para continuar o atendimento com você." />
      </FormField>
    </div>
  )
}

// ── 6. Ensaio ────────────────────────────────────────────────────────────────

export function EtapaEnsaio({ spec, mudar }: { spec: AgentSpec; mudar: Mudar }) {
  const [pergunta, setPergunta] = useState('')
  const [pensando, setPensando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const sugestoes = PERGUNTAS_DE_ENSAIO[spec.identity.goal].filter((q) => !spec.tests.some((t) => t.question === q))

  const perguntar = async (q: string) => {
    const texto = q.trim()
    if (!texto || pensando) return
    setPensando(true)
    setErro(null)
    try {
      // Antes de publicar não há agente: o ensaio usa o texto da spec, com as
      // mesmas camadas da plataforma (modo compilado, canal WhatsApp).
      const r = await chatWithAgent(textoParaEnsaio(spec), [{ role: 'user', content: texto }])
      mudar((s) => ({ ...s, tests: [...s.tests, { question: texto, answer: r.message, verdict: null }] }))
      setPergunta('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'O agente não respondeu.')
    } finally {
      setPensando(false)
    }
  }
  const avaliar = (i: number, verdict: 'boa' | 'ruim') => mudar((s) => ({
    ...s, tests: s.tests.map((t, j) => (j === i ? { ...t, verdict } : t)),
  }))

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-400">Pergunte como um cliente perguntaria e marque se a resposta está boa. Cada teste fica salvo e vira um caso para conferir a cada mudança.</p>
      {sugestoes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sugestoes.map((q) => (
            <Button key={q} size="sm" variant="neutral" onClick={() => void perguntar(q)} disabled={pensando}>{q}</Button>
          ))}
        </div>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void perguntar(pergunta) }}>
        <Input value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Escreva uma pergunta" className="flex-1" />
        <Button type="submit" size="md" disabled={pensando || !pergunta.trim()} leftIcon={pensando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}>
          Perguntar
        </Button>
      </form>
      {erro && <Banner variant="danger">{erro}</Banner>}
      <ul className="space-y-3">
        {spec.tests.map((t, i) => (
          <li key={`${t.question}-${i}`} className="rounded-lg border border-surface-700 p-4">
            <p className="text-sm font-medium text-surface-100">{t.question}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-surface-300">{t.answer}</p>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" variant={t.verdict === 'boa' ? 'primary' : 'neutral'} leftIcon={<ThumbsUp className="h-3.5 w-3.5" />} onClick={() => avaliar(i, 'boa')}>Boa</Button>
              <Button size="sm" variant={t.verdict === 'ruim' ? 'danger' : 'neutral'} leftIcon={<ThumbsDown className="h-3.5 w-3.5" />} onClick={() => avaliar(i, 'ruim')}>Ruim</Button>
              {t.verdict === 'ruim' && <span className="text-xs text-surface-400">Ajuste a persona ou o fluxo na etapa 2 e teste de novo.</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── 7. Colocar no ar ─────────────────────────────────────────────────────────

/** Linha de WhatsApp com o agente que a atende hoje (nome cruzado da lista de agentes). */
export interface LinhaParaEscolher {
  id: string
  displayPhoneNumber: string
  label?: string | null
  agentId: string | null
  agentName: string | null
}

function rotuloDaLinha(n: LinhaParaEscolher, agentId: string | undefined): string {
  const base = `${n.label ? `${n.label} · ` : ''}${n.displayPhoneNumber}`
  if (!n.agentId) return base
  if (n.agentId === agentId) return `${base} — atendida por este agente`
  return `${base} — hoje atendida por ${n.agentName ?? 'outro agente'}`
}

export function EtapaNoAr({
  spec, mudar, numeros, agentId, prontidao, carregarProntidao, servidorOk, salvoNoServidor,
}: {
  spec: AgentSpec
  mudar: Mudar
  numeros: LinhaParaEscolher[]
  /** Revisão de um agente existente: a linha dele não é "ocupada". */
  agentId?: string
  prontidao: ReadinessItem[] | null
  carregarProntidao: () => void
  servidorOk: boolean
  /** O rascunho do servidor já tem a última mudança (o salvamento tem um respiro). */
  salvoNoServidor: boolean
}) {
  // A prontidão é calculada sobre o rascunho SALVO: pedir antes do salvamento
  // mostrava o estado anterior (ex.: "Número escolhido" depois de tirar o número).
  useEffect(() => { if (servidorOk && salvoNoServidor) carregarProntidao() }, [servidorOk, salvoNoServidor, carregarProntidao])
  const escolhida = numeros.find((n) => n.id === spec.channel.whatsappNumberId)
  const ocupada = escolhida?.agentId && escolhida.agentId !== agentId ? escolhida : null
  return (
    <div className="space-y-6">
      <FormField
        label="Número de WhatsApp que ele atende"
        hint={agentId ? '"Escolher depois" não muda a linha que o agente atende hoje.' : undefined}
      >
        <Select value={spec.channel.whatsappNumberId ?? ''} onChange={(e) => mudar((s) => ({ ...s, channel: { whatsappNumberId: e.target.value || null } }))}>
          <option value="">Escolher depois</option>
          {numeros.map((n) => (
            <option key={n.id} value={n.id}>{rotuloDaLinha(n, agentId)}</option>
          ))}
        </Select>
      </FormField>
      {ocupada && (
        <Banner variant="warning">
          Esta linha hoje é atendida por <strong>{ocupada.agentName ?? 'outro agente'}</strong>. Ao publicar, ela passa a ser
          atendida por este agente, e {ocupada.agentName ?? 'o outro agente'} deixa de atender nela.
        </Banner>
      )}
      <div>
        <p className="mb-2 text-sm font-medium text-surface-200">Pronto para publicar?</p>
        {!servidorOk ? (
          <Banner variant="warning">O rascunho não está salvo no servidor, então não dá para publicar daqui. O servidor dos agentes pode estar numa versão anterior.</Banner>
        ) : !prontidao ? (
          <p className="text-sm text-surface-400">Conferindo…</p>
        ) : (
          <ul className="space-y-2">
            {prontidao.map((i) => (
              <li key={i.id} className="flex items-start gap-2 text-sm">
                <span className={cn('mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full', i.ok ? 'bg-status-active text-white' : i.blocking ? 'bg-danger text-white' : 'bg-surface-600 text-white')}>
                  {i.ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <span className="text-[10px] font-bold">!</span>}
                </span>
                <span>
                  <span className={i.ok ? 'text-surface-200' : 'text-surface-100'}>{i.label}</span>
                  {!i.ok && i.detail && <span className="block text-xs text-surface-400">{i.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
