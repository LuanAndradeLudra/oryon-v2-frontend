import { useState, type ReactNode } from 'react'
import { AlertTriangle, BookOpen, CheckCircle2, ChevronDown, Cpu, Gavel, Repeat, ShieldCheck, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SupportChip } from '../SupportChip'
import { DESFECHO, sinaisDoTurno } from './diagnosticoDoTurno'

/**
 * LINHA DO TEMPO DO TURNO DA IA (SCRUM-1384) — o que a IA recebeu, consultou,
 * chamou e respondeu, e o que o sistema conferiu, a partir da evidência
 * gravada (`SupportTurnEvidence v1`, mascarada). Feita para ser reaproveitada
 * pela tela do trace do épico 1256 (SCRUM-1357): recebe o retrato, não busca nada.
 */
export interface TurnoGravado {
  v?: number
  ligacao?: string
  requestId?: string | null
  traceId?: string | null
  classificacao?: string[]
  disponibilidade?: Record<string, string>
  rastro?: { desfecho?: string | null; latenciaMs?: number | null; transferiu?: boolean } | null
  secoes?: {
    turno?: {
      status?: string; modelo?: string | null; erro?: unknown; bytes?: number; cortes?: unknown[]
      prompt?: { versao?: string | null; hash?: string | null } | null
      textoDoModelo?: string | null; respostaFinal?: string | null; ferramentasChamadas?: unknown
      entrada?: Array<{ role: string; content: unknown }>; flags?: Record<string, unknown>
    } | null
    execucao?: { status?: string; modelo?: string | null; voltas?: number; duracaoMs?: number; custoUsd?: string; tokens?: Record<string, number>; erro?: { codigo?: string; mensagem?: string } | null } | null
    chamadasAoModelo?: Array<Record<string, unknown>>
    ferramentas?: Array<Record<string, unknown>>
    baseDeConhecimento?: Array<Record<string, unknown>>
    verificacao?: Array<{ verdict?: string; findings?: unknown[]; shadow?: boolean; sources?: { catalog?: string; kbChunks?: number; priorReplies?: number; skillOutputs?: number } }>
    guardas?: Record<string, unknown[]>
    antiLoop?: unknown[]
    juizDoCrm?: unknown[]
  }
}

const NOME_DA_SECAO: Record<string, string> = {
  turno: 'turno gravado', execucao: 'execução', chamadasAoModelo: 'chamadas ao modelo', ferramentas: 'ferramentas',
  baseDeConhecimento: 'base de conhecimento', verificacao: 'verificação', guardas: 'guardas', antiLoop: 'anti-loop', juizDoCrm: 'juiz do CRM',
}

/** Retrato em JSON, dobrável (já vem mascarado e cortado no teto). */
export function Detalhes({ dados, rotulo = 'Ver o retrato' }: { dados: unknown; rotulo?: string }) {
  const [aberto, setAberto] = useState(false)
  if (dados === undefined || dados === null) return null
  return (
    <div className="mt-1">
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="inline-flex items-center gap-1 text-[11px] font-semibold text-surface-400 hover:text-surface-100">
        <ChevronDown className={cn('w-3 h-3 transition-transform', aberto && 'rotate-180')} aria-hidden />{aberto ? 'Esconder' : rotulo}
      </button>
      {aberto && (
        <pre className="mt-1 max-h-[320px] overflow-auto font-mono text-[11px] text-surface-300 bg-surface-900 border border-[var(--bd2)] rounded-[6px] px-2 py-1.5 whitespace-pre-wrap break-words">
          {JSON.stringify(dados, null, 2)}
        </pre>
      )}
    </div>
  )
}

function Passo({ icone: Icone, titulo, resumo, alerta, children }: { icone: LucideIcon; titulo: string; resumo?: ReactNode; alerta?: boolean; children?: ReactNode }) {
  return (
    <li className="grid grid-cols-[24px_1fr] gap-2.5 px-4 py-2.5 border-b border-[var(--bd2)] last:border-b-0">
      <span className={cn('w-6 h-6 rounded-[6px] flex items-center justify-center', alerta ? 'bg-warning/[.14] text-warning' : 'bg-[var(--rowhover)] text-surface-300')}>
        <Icone className="w-3.5 h-3.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-surface-100">{titulo}</p>
        {resumo && <p className="text-xs text-surface-300 break-words">{resumo}</p>}
        {children}
      </div>
    </li>
  )
}

const quantos = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

function DiagnosticoDoTurno({ turno }: { turno: TurnoGravado }) {
  const sinais = sinaisDoTurno(turno)
  if (!sinais.length) return null
  return (
    <dl className="px-4 pt-3 grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5" aria-label="Diagnóstico do turno">
      {sinais.map((x) => (
        <div key={x.rotulo} className="contents">
          <dt className="text-[11px] text-surface-400 pt-px">{x.rotulo}</dt>
          <dd className={cn('text-xs flex items-start gap-1.5 min-w-0', x.alerta ? 'font-semibold text-surface-100' : 'text-surface-300')}>
            {x.alerta
              ? <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0 text-warning" aria-label="fora do normal" />
              : x.informativo
                ? <span className="w-3.5 flex-shrink-0" aria-hidden />
                : <CheckCircle2 className="w-3.5 h-3.5 mt-px flex-shrink-0 text-surface-500" aria-hidden />}
            <span className="break-words">{x.valor}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function LinhaDoTempoDoTurno({ turno, acoes }: { turno: TurnoGravado; acoes?: ReactNode }) {
  const s = turno.secoes ?? {}
  const t = s.turno ?? null
  const ex = s.execucao ?? null
  const chamadas = s.chamadasAoModelo ?? []
  const ferramentas = s.ferramentas ?? []
  const base = s.baseDeConhecimento ?? []
  const verificacao = s.verificacao ?? []
  const guardas = Object.entries(s.guardas ?? {}).filter(([, v]) => Array.isArray(v) && v.length > 0)
  const achados = verificacao.reduce((n, v) => n + (v.findings?.length ?? 0), 0)
  const indisponiveis = Object.entries(turno.disponibilidade ?? {}).filter(([, v]) => v === 'indisponivel' || v === 'erro')
  const modelo = ex?.modelo ?? t?.modelo ?? null
  const versao = t?.prompt?.versao ?? null
  const mudou = !!t?.textoDoModelo && !!t?.respostaFinal && t.textoDoModelo.trim() !== t.respostaFinal.trim()
  const erroDaExecucao = ex?.erro ?? null
  const tokens = ex?.tokens ? (ex.tokens.entrada ?? 0) + (ex.tokens.saida ?? 0) : null

  return (
    <section className="sup-cartao overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-[var(--bd2)]">
        <span className="text-[13px] font-semibold text-surface-100">Turno da IA</span>
        <span className="font-mono text-[11px] text-surface-400">
          {[modelo, versao ? `prompt ${versao}` : null, turno.ligacao === 'aproximada' ? 'ligação aproximada' : null].filter(Boolean).join(' · ')}
        </span>
        {turno.rastro?.desfecho && <SupportChip tom={turno.rastro.desfecho === 'reply_created' ? 'neutral' : 'warning'}>{DESFECHO[turno.rastro.desfecho] ?? turno.rastro.desfecho}</SupportChip>}
        {acoes && <span className="ml-auto flex items-center gap-1.5">{acoes}</span>}
      </header>
      <DiagnosticoDoTurno turno={turno} />
      {(turno.classificacao?.length ?? 0) > 0 && (
        <div className="px-4 pt-2.5 flex flex-wrap gap-1.5" aria-label="Classificação da falha">
          {turno.classificacao!.map((k) => <SupportChip key={k} tom="danger"><span className="font-mono">{k}</span></SupportChip>)}
        </div>
      )}
      {mudou && (
        // Neutro, com o rótulo colorido: a cor diz o que é cada lado.
        <div className="px-4 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-[8px] border border-[var(--bd2)] px-2.5 py-1.5 text-xs text-surface-100 break-words">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-warning">O modelo escreveu</span>{t!.textoDoModelo}
          </div>
          <div className="rounded-[8px] border border-[var(--bd2)] px-2.5 py-1.5 text-xs text-surface-100 break-words">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-success">Foi enviado ao contato</span>{t!.respostaFinal}
          </div>
        </div>
      )}
      {!mudou && t?.respostaFinal && <p className="px-4 pt-3 text-xs text-surface-300 italic break-words">“{t.respostaFinal}”</p>}
      <ol className="flex flex-col">
        <Passo icone={Cpu} titulo="Execução" alerta={!!erroDaExecucao}
          resumo={[ex?.status ?? t?.status, ex?.voltas ? quantos(ex.voltas, 'volta', 'voltas') : null, ex?.duracaoMs ? `${(ex.duracaoMs / 1000).toFixed(1)} s` : null,
            tokens !== null ? `${tokens} tokens` : null, ex?.custoUsd ? `US$ ${Number(ex.custoUsd).toFixed(4)}` : null,
            erroDaExecucao ? `erro: ${erroDaExecucao.codigo ?? ''}` : null].filter(Boolean).join(' · ')}>
          <Detalhes dados={ex} />
        </Passo>
        <Passo icone={Repeat} titulo="Chamadas ao modelo" alerta={chamadas.some((c) => c.status === 'error')}
          resumo={chamadas.length ? chamadas.map((c) => `${String(c.model ?? '')} ${String(c.status ?? '')}${c.error_class ? ` (${String(c.error_class)})` : ''}`).join(' · ') : 'nenhuma registrada'}>
          <Detalhes dados={chamadas.length ? chamadas : null} />
        </Passo>
        <Passo icone={Wrench} titulo="Ferramentas" resumo={ferramentas.length ? ferramentas.map((f) => String(f.nome ?? f.name ?? f.tool ?? 'ferramenta')).join(' · ') : 'nenhuma'}>
          <Detalhes dados={ferramentas.length ? ferramentas : null} rotulo="Ver entrada e saída" />
        </Passo>
        <Passo icone={BookOpen} titulo="Base de conhecimento" resumo={base.length ? quantos(base.length, 'consulta', 'consultas') : 'não consultada'}>
          <Detalhes dados={base.length ? base : null} />
        </Passo>
        <Passo icone={ShieldCheck} titulo="Verificação" alerta={achados > 0 || guardas.length > 0}
          resumo={[verificacao.length ? verificacao.map((v) => `${v.verdict ?? '—'}${v.shadow ? ' (sombra)' : ''}`).join(' · ') : 'sem verificação',
            achados ? quantos(achados, 'achado', 'achados') : null,
            guardas.length ? `guardas: ${guardas.map(([g, v]) => `${g} ${v.length}`).join(', ')}` : null].filter(Boolean).join(' · ')}>
          <Detalhes dados={verificacao.length || guardas.length ? { verificacao, guardas: s.guardas } : null} />
        </Passo>
        {((s.antiLoop?.length ?? 0) > 0 || (s.juizDoCrm?.length ?? 0) > 0) && (
          <Passo icone={Gavel} titulo="Anti-loop e juiz do CRM"
            resumo={[s.antiLoop?.length ? quantos(s.antiLoop.length, 'evento de anti-loop', 'eventos de anti-loop') : null,
              s.juizDoCrm?.length ? quantos(s.juizDoCrm.length, 'decisão do juiz', 'decisões do juiz') : null].filter(Boolean).join(' · ')}>
            <Detalhes dados={{ antiLoop: s.antiLoop, juizDoCrm: s.juizDoCrm }} />
          </Passo>
        )}
      </ol>
      {(indisponiveis.length > 0 || (t?.cortes?.length ?? 0) > 0) && (
        <p className="px-4 py-2 text-[11px] text-warning border-t border-[var(--bd2)]">
          {indisponiveis.length > 0 && `Sem dado: ${indisponiveis.map(([k]) => NOME_DA_SECAO[k] ?? k).join(', ')}. `}
          {(t?.cortes?.length ?? 0) > 0 && 'Parte do turno foi cortada no teto de gravação.'}
        </p>
      )}
      {t?.entrada && (
        <div className="px-4 py-2 border-t border-[var(--bd2)]">
          <Detalhes dados={t.entrada} rotulo="Ver o que a IA recebeu (conversa e estado)" />
          {t.flags && <Detalhes dados={t.flags} rotulo="Ver as flags do turno" />}
        </div>
      )}
    </section>
  )
}
