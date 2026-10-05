import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentSpec } from '@/services/agentsApi'
import { ETAPAS, ETAPA_ENTREVISTA, ETAPA_EXEMPLOS, ETAPA_TEXTO, OBJETIVOS, TONS, cobertura, pendenciaNaEtapa } from './especificacao'
import type { FontesDaConta } from './EtapasDeEstudo'
import type { LinhaParaEscolher } from './EtapasDoAssistente'

interface Item {
  etapa: number
  rotulo: string
  valor: string
  feito: boolean
}

/**
 * Painel ao lado do formulário (desktop largo): o agente tomando forma a cada
 * resposta — quem ele é, como fala, o que já sabe, o que ainda falta. Só lê a
 * especificação; nada aqui muda o rascunho.
 */
export function PainelDoAgente({ spec, etapa, fontes, numeros }: {
  spec: AgentSpec
  etapa: number
  fontes: FontesDaConta
  numeros: LinhaParaEscolher[] | null
}) {
  const ctx = spec.context
  const pct = cobertura(spec, { catalogo: (fontes.catalogo?.count ?? 0) > 0, profissionais: (fontes.profissionais ?? 0) > 0 })
  const objetivo = OBJETIVOS.find((o) => o.id === spec.identity.goal)?.rotulo
  const tom = TONS.find((t) => t.id === spec.persona.tone)
  const exemplo = ctx.examples[0]?.answer ?? tom?.exemplo ?? ''
  const nome = spec.identity.name.trim()
  const respondidas = ctx.interview.filter((i) => !i.skipped && i.answer !== null).length
  const pendentes = ctx.interview.filter((i) => i.skipped).length
  const confirmados = ctx.findings.filter((f) => f.confirmed).length
  const boas = spec.tests.filter((t) => t.verdict === 'boa').length
  const ruins = spec.tests.filter((t) => t.verdict === 'ruim').length
  const linha = numeros?.find((n) => n.id === spec.channel.whatsappNumberId)
  const textoPronto = spec.persona.text.trim().length >= 20 && spec.flow.text.trim().length >= 20
  const falta = pendenciaNaEtapa(etapa, spec)

  const itens: Item[] = [
    { etapa: 1, rotulo: 'Negócio', valor: spec.identity.segment?.trim() || 'Ainda não contou', feito: !!spec.identity.segment?.trim() && ctx.studied },
    {
      etapa: 2, rotulo: 'Resumo da empresa',
      valor: ctx.findings.length ? `${confirmados} de ${ctx.findings.length} confirmados` : ctx.studied ? 'Nada das fontes' : 'Depois do estudo',
      feito: ctx.findings.length > 0 && confirmados === ctx.findings.length,
    },
    {
      etapa: ETAPA_ENTREVISTA, rotulo: 'Entrevista',
      valor: ctx.interview.length ? `${respondidas} de ${ctx.interview.length} respondidas` : 'Ainda não começou',
      feito: ctx.interview.length > 0 && respondidas === ctx.interview.length,
    },
    {
      etapa: ETAPA_EXEMPLOS, rotulo: 'Exemplos de resposta',
      valor: ctx.examples.length ? `${ctx.examples.length} ${ctx.examples.length === 1 ? 'escolhido' : 'escolhidos'}` : 'Nenhum ainda',
      feito: ctx.examples.length > 0,
    },
    { etapa: ETAPA_TEXTO, rotulo: 'Texto do agente', valor: textoPronto ? 'Escrito' : 'Falta escrever', feito: textoPronto },
    {
      etapa: 6, rotulo: 'Ensaio',
      valor: spec.tests.length ? `${spec.tests.length} ${spec.tests.length === 1 ? 'teste' : 'testes'} · ${boas} boas${ruins ? ` · ${ruins} ruins` : ''}` : 'Nenhum teste',
      feito: boas > 0,
    },
    {
      etapa: 7, rotulo: 'Número de WhatsApp',
      valor: linha ? (linha.label ? `${linha.label} · ${linha.displayPhoneNumber}` : linha.displayPhoneNumber) : 'Escolher depois',
      feito: !!linha,
    },
  ]

  return (
    <aside aria-label="Seu agente até agora" className="space-y-4">
      <section className="rounded-lg border border-surface-700 bg-surface-800 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-surface-500">Seu agente até agora</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-dark" aria-hidden="true">
            {(nome || '?').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className={cn('truncate text-sm font-semibold', nome ? 'text-surface-100' : 'text-surface-400')}>{nome || 'Sem nome ainda'}</p>
            <p className="truncate text-xs text-surface-400">{[spec.identity.segment?.trim(), objetivo].filter(Boolean).join(' · ') || 'Tipo de negócio a definir'}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-surface-400">Quanto conhece a empresa</span>
            <span className="font-semibold text-surface-200">{pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-surface-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Quanto o agente conhece a empresa">
            <div className="h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {exemplo && (
          <div className="mt-4">
            <p className="text-xs text-surface-400">Jeito de falar{tom ? ` · ${tom.rotulo}` : ''}{ctx.examples.length ? ' · exemplo escolhido' : ''}</p>
            <p className="mt-1.5 line-clamp-3 max-w-[90%] whitespace-pre-wrap rounded-lg rounded-tl-sm bg-surface-700 px-3 py-2 text-xs leading-relaxed text-surface-100">
              {exemplo}
            </p>
                      </div>
        )}
      </section>

      {etapa < ETAPAS.length && (
        <section className={cn('rounded-lg border px-4 py-3 text-xs', falta ? 'border-[var(--color-accent-amber)]/40' : 'border-surface-700')} aria-live="polite">
          <p className="font-semibold text-surface-200">Para seguir: {ETAPAS[etapa - 1]}</p>
          <p className={cn('mt-1', falta ? 'text-surface-300' : 'text-surface-400')}>{falta ? falta.mensagem : 'Tudo certo para continuar.'}</p>
        </section>
      )}

      <section className="rounded-lg border border-surface-700 p-4">
        <p className="text-xs font-semibold text-surface-200">O que ele já tem</p>
        <ul className="mt-2 space-y-0.5">
          {itens.map((i) => (
            <li
              key={i.rotulo}
              aria-current={i.etapa === etapa ? 'step' : undefined}
              className={cn('flex items-center gap-2 rounded-sm px-2 py-1 text-xs', i.etapa === etapa && 'bg-surface-800')}
            >
              {i.feito
                ? <Check className="h-3.5 w-3.5 flex-shrink-0 text-accent-dark" strokeWidth={3} aria-label="feito" />
                : <Circle className="h-3.5 w-3.5 flex-shrink-0 text-surface-600" aria-label="pendente" />}
              <span className={cn('flex-shrink-0', i.etapa === etapa ? 'font-semibold text-surface-100' : 'text-surface-300')}>{i.rotulo}</span>
              <span className="min-w-0 flex-1 truncate text-right text-surface-500" title={i.valor}>{i.valor}</span>
            </li>
          ))}
        </ul>
        {pendentes > 0 && (
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-accent-amber)]">
            {pendentes} {pendentes === 1 ? 'pergunta ficou' : 'perguntas ficaram'} para depois: nesses assuntos ele diz que vai confirmar com a equipe.
          </p>
        )}
      </section>

    </aside>
  )
}
