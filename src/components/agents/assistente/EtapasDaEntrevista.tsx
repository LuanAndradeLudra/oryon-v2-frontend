import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, Loader2, MessageSquareText, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  fetchAnswerExamples, fetchInterview,
  type AgentSpec, type AnswerExampleSet, type InterviewAnswer, type InterviewQuestion,
} from '@/services/agentsApi'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { EtapaPodeFazer, EtapaTransferencia } from './EtapasDoAssistente'

type Mudar = (fn: (s: AgentSpec) => AgentSpec) => void

function Pilula({ ativa, onClick, children }: { ativa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativa}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-left text-sm transition-colors',
        ativa ? 'border-brand-500 bg-accent-soft font-medium text-surface-100' : 'border-surface-700 text-surface-300 hover:border-surface-600',
      )}
    >
      {ativa && <Check className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={3} aria-hidden />}
      {children}
    </button>
  )
}

const DESTINO: Record<InterviewQuestion['destination'], { rotulo: string; icone: typeof BookOpen }> = {
  behavior: { rotulo: 'Vai para o texto do agente', icone: MessageSquareText },
  fact: { rotulo: 'Vai para a base de conhecimento', icone: BookOpen },
}

function Pergunta({
  n, q, resposta, doEstudo, onResponder, onDepois,
}: {
  n: number
  q: InterviewQuestion
  resposta: InterviewAnswer | undefined
  doEstudo: boolean
  onResponder: (a: string | string[] | null) => void
  onDepois: () => void
}) {
  const valor = resposta?.answer ?? null
  const lista = Array.isArray(valor) ? valor : []
  const d = DESTINO[q.destination]
  return (
    <li className="rounded-lg border border-surface-700 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-surface-100">{n}. {q.question}</p>
        {resposta?.skipped
          ? <span className="rounded-full bg-surface-700 px-2.5 py-0.5 text-2xs font-semibold text-surface-300">Para depois</span>
          : valor !== null && doEstudo
            ? <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-2xs font-semibold text-accent-dark">Das fontes — confira</span>
            : null}
      </div>
      <p className="mt-1 text-xs text-surface-400">Por que perguntamos: {q.why}</p>
      <div className="mt-3">
        {q.kind === 'text' ? (
          <Input
            aria-label={q.question}
            value={typeof valor === 'string' ? valor : ''}
            placeholder={q.placeholder}
            onChange={(e) => onResponder(e.target.value.trim() ? e.target.value : null)}
          />
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label={q.question}>
            {q.options!.map((o) => (
              <Pilula
                key={o}
                ativa={q.kind === 'single' ? valor === o : lista.includes(o)}
                onClick={() => {
                  if (q.kind === 'single') return onResponder(valor === o ? null : o)
                  const prox = lista.includes(o) ? lista.filter((x) => x !== o) : [...lista, o]
                  onResponder(prox.length ? prox : null)
                }}
              >
                {o}
              </Pilula>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-surface-400">
        <span className="inline-flex items-center gap-1.5"><d.icone className="h-3.5 w-3.5" aria-hidden />{d.rotulo}</span>
        {!resposta?.skipped && valor === null && (
          <button type="button" className="font-medium text-brand-400 hover:underline" onClick={onDepois}>Responder depois</button>
        )}
      </div>
    </li>
  )
}

// ── 3. Entrevista ────────────────────────────────────────────────────────────

export function EtapaEntrevista({ spec, mudar, setores }: { spec: AgentSpec; mudar: Mudar; setores: Array<{ id: string; name: string }> }) {
  const [perguntas, setPerguntas] = useState<InterviewQuestion[] | null>(null)
  const [segmento, setSegmento] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [doEstudo, setDoEstudo] = useState<Set<string>>(new Set())
  const segmentoPedido = spec.identity.segment ?? ''
  const specRef = useRef(spec)
  specRef.current = spec

  useEffect(() => {
    let vivo = true
    setErro(null)
    fetchInterview(specRef.current)
      .then((r) => {
        if (!vivo) return
        setPerguntas(r.questions)
        setSegmento(r.segment.label)
        // O que o estudo já respondia entra preenchido, só onde o dono ainda não respondeu.
        const preenchidas = new Set<string>()
        mudar((s) => {
          const atuais = new Map(s.context.interview.map((i) => [i.id, i]))
          const interview: InterviewAnswer[] = r.questions.map((q) => {
            const atual = atuais.get(q.id)
            if (atual) return { ...atual, question: q.question, destination: q.destination }
            if (q.prefill !== null) preenchidas.add(q.id)
            return { id: q.id, question: q.question, destination: q.destination, answer: q.prefill, skipped: false }
          })
          return { ...s, context: { ...s.context, interview } }
        })
        setDoEstudo(preenchidas)
      })
      .catch((e) => { if (vivo) { setErro(e instanceof Error ? e.message : 'Não deu para carregar as perguntas.'); setPerguntas([]) } })
    return () => { vivo = false }
  }, [segmentoPedido, mudar])

  const responder = (q: InterviewQuestion, answer: string | string[] | null) => mudar((s) => ({
    ...s,
    context: {
      ...s.context,
      interview: s.context.interview.map((i) => (i.id === q.id ? { ...i, answer, skipped: false } : i)),
    },
  }))
  const depois = (q: InterviewQuestion) => mudar((s) => ({
    ...s,
    context: { ...s.context, interview: s.context.interview.map((i) => (i.id === q.id ? { ...i, answer: null, skipped: true } : i)) },
  }))

  const respostas = new Map(spec.context.interview.map((i) => [i.id, i]))
  const respondidas = spec.context.interview.filter((i) => i.answer !== null && !i.skipped).length

  return (
    <div className="space-y-8">
      <section aria-labelledby="entrevista-atendimento" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 id="entrevista-atendimento" className="text-base font-bold text-surface-100">Sobre o atendimento</h3>
            <p className="mt-1 text-sm text-surface-400">
              Perguntas de quem está no primeiro dia de trabalho{segmento ? ` em ${segmento}` : ''}. Nenhuma é sobre IA.
            </p>
          </div>
          {perguntas && perguntas.length > 0 && (
            <span className="text-sm font-semibold tabular-nums text-surface-200">{respondidas} de {perguntas.length} respondidas</span>
          )}
        </div>
        {erro && <Banner variant="warning">{erro} Você pode seguir; sem a entrevista, o agente responde com o que está nas fontes e no texto.</Banner>}
        {perguntas === null ? (
          <p className="flex items-center gap-2 text-sm text-surface-400"><Loader2 className="h-4 w-4 animate-spin" /> Montando as perguntas do seu segmento…</p>
        ) : (
          <ol className="space-y-3">
            {perguntas.map((q, i) => (
              <Pergunta
                key={q.id} n={i + 1} q={q} resposta={respostas.get(q.id)} doEstudo={doEstudo.has(q.id)}
                onResponder={(a) => responder(q, a)} onDepois={() => depois(q)}
              />
            ))}
          </ol>
        )}
        <p className="text-xs text-surface-500">O que ficar sem resposta vira pendência: nesses assuntos o agente não inventa e diz que vai confirmar com a equipe.</p>
      </section>

      <section aria-labelledby="entrevista-acoes" className="space-y-3">
        <h3 id="entrevista-acoes" className="text-base font-bold text-surface-100">O que ele faz sozinho</h3>
        <EtapaPodeFazer spec={spec} mudar={mudar} />
      </section>

      <section aria-labelledby="entrevista-transferencia" className="space-y-3">
        <h3 id="entrevista-transferencia" className="text-base font-bold text-surface-100">Quando chamar uma pessoa</h3>
        <EtapaTransferencia spec={spec} mudar={mudar} setores={setores} />
      </section>
    </div>
  )
}

// ── 4. Jeito de responder ────────────────────────────────────────────────────

const ESTILO: Record<AnswerExampleSet['answers'][number]['style'], string> = {
  direta: 'Mais direta',
  acolhedora: 'Mais acolhedora',
  detalhada: 'Mais explicada',
}

export function EtapaJeitoDeResponder({ spec, mudar }: { spec: AgentSpec; mudar: Mudar }) {
  const [conjuntos, setConjuntos] = useState<AnswerExampleSet[] | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const specRef = useRef(spec)
  specRef.current = spec

  const sugerir = async () => {
    setCarregando(true)
    setErro(null)
    try {
      const r = await fetchAnswerExamples(specRef.current)
      setConjuntos(r.examples)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para sugerir exemplos agora.')
    } finally {
      setCarregando(false)
    }
  }
  // Primeira vez na etapa: já sugere. Com exemplos escolhidos antes, espera o dono pedir.
  useEffect(() => {
    if (specRef.current.context.examples.length === 0) void sugerir()
  }, [])

  const escolhido = (question: string) => spec.context.examples.find((e) => e.question === question)
  const escolher = (question: string, answer: string | null) => mudar((s) => ({
    ...s,
    context: {
      ...s.context,
      examples: answer === null
        ? s.context.examples.filter((e) => e.question !== question)
        : [...s.context.examples.filter((e) => e.question !== question), { question, answer }],
    },
  }))

  // Exemplos escolhidos numa visita anterior, sem as sugestões carregadas.
  const soEscolhidos = !conjuntos && spec.context.examples.length > 0

  return (
    <div className="space-y-6">
      <p className="text-sm text-surface-400">
        Mostrar é mais fácil que descrever. Para cada pergunta comum, escolha a resposta com a cara da empresa e ajuste se quiser.
        As escolhidas viram exemplos que o agente segue. Valores e dados continuam vindo das fontes.
      </p>
      {erro && <Banner variant="warning">{erro} Você pode seguir sem exemplos.</Banner>}
      {carregando && <p className="flex items-center gap-2 text-sm text-surface-400"><Loader2 className="h-4 w-4 animate-spin" /> Escrevendo respostas de exemplo…</p>}

      {soEscolhidos && (
        <ul className="space-y-3">
          {spec.context.examples.map((e) => (
            <li key={e.question} className="rounded-lg border border-surface-700 p-4">
              <p className="text-xs text-surface-400">Pergunta de cliente</p>
              <p className="text-sm font-semibold text-surface-100">“{e.question}”</p>
              <Textarea className="mt-3" rows={3} aria-label={`Resposta escolhida: ${e.question}`} value={e.answer} onChange={(ev) => escolher(e.question, ev.target.value)} />
            </li>
          ))}
        </ul>
      )}

      {conjuntos && (
        <ol className="space-y-6">
          {conjuntos.map((c) => {
            const atual = escolhido(c.question)
            return (
              <li key={c.question} className="space-y-3">
                <div>
                  <p className="text-xs text-surface-400">Pergunta de cliente</p>
                  <p className="text-sm font-semibold text-surface-100">“{c.question}”</p>
                </div>
                <div className="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label={`Respostas para: ${c.question}`}>
                  {c.answers.map((a) => {
                    const ativa = atual?.answer === a.text
                    return (
                      <button
                        key={a.style}
                        type="button"
                        role="radio"
                        aria-checked={ativa}
                        onClick={() => escolher(c.question, ativa ? null : a.text)}
                        className={cn(
                          'flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors',
                          ativa ? 'border-brand-500 bg-accent-soft' : 'border-surface-700 hover:border-surface-600',
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-surface-300">
                          {ativa && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}{ESTILO[a.style]}
                        </span>
                        <span className="text-sm leading-relaxed text-surface-100">{a.text}</span>
                      </button>
                    )
                  })}
                </div>
                {atual && (
                  <Textarea rows={3} aria-label={`Ajustar a resposta: ${c.question}`} value={atual.answer} onChange={(e) => escolher(c.question, e.target.value)} />
                )}
              </li>
            )
          })}
        </ol>
      )}

      <Button variant="neutral" size="sm" onClick={() => void sugerir()} disabled={carregando}
        leftIcon={carregando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}>
        {conjuntos || soEscolhidos ? 'Sugerir outras respostas' : 'Sugerir respostas'}
      </Button>
    </div>
  )
}

// ── 7. Colocar no ar: para onde foi cada coisa ───────────────────────────────

export function ParaOndeFoi({ spec }: { spec: AgentSpec }) {
  const ctx = spec.context
  const regras = ctx.interview.filter((i) => i.destination === 'behavior' && !i.skipped && i.answer !== null).length
  const fatos = ctx.interview.filter((i) => i.destination === 'fact' && !i.skipped && i.answer !== null)
  const pendentes = ctx.interview.filter((i) => i.skipped)
  const confirmados = ctx.findings.filter((f) => f.confirmed).length
  const bloco = (titulo: string, itens: string[]) => (
    <div className="rounded-lg border border-surface-700 p-4">
      <p className="text-sm font-semibold text-surface-100">{titulo}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-surface-300">
        {itens.length ? itens.map((t) => <li key={t}>{t}</li>) : <li className="list-none pl-0 text-surface-500">Nada</li>}
      </ul>
    </div>
  )
  return (
    <section aria-labelledby="para-onde-foi" className="space-y-3">
      <h3 id="para-onde-foi" className="text-sm font-semibold text-surface-200">Para onde foi cada coisa que você contou</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {bloco('Texto do agente', [
          ...(confirmados ? [`${confirmados} ${confirmados === 1 ? 'item confirmado' : 'itens confirmados'} sobre o negócio`] : []),
          ...(regras ? [`${regras} ${regras === 1 ? 'regra' : 'regras'} de atendimento da entrevista`] : []),
          ...(ctx.examples.length ? [`${ctx.examples.length} ${ctx.examples.length === 1 ? 'exemplo' : 'exemplos'} de resposta`] : []),
        ])}
        {bloco('Base de conhecimento (ao publicar)', fatos.map((f) => f.question))}
      </div>
      {(pendentes.length > 0 || ctx.pendingCompany) && (
        <Banner variant="warning">
          <span className="block font-medium">Pendências — nesses assuntos o agente não inventa e diz que vai confirmar com a equipe, até você responder:</span>
          <ul className="mt-1 list-disc pl-4">
            {pendentes.map((p) => <li key={p.id}>{p.question}</li>)}
            {ctx.pendingCompany && <li>Dados da empresa esperando um administrador salvar no Contexto da IA</li>}
          </ul>
        </Banner>
      )}
    </section>
  )
}
