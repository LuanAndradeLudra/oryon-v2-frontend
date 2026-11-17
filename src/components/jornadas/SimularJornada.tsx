import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { cn } from '@/lib/utils'
import type { ApoioDoEditor, ContatoMascarado, ResultadoDaSimulacao as Resultado, VersaoDaJornada } from '@/services/jornadas/tipos'
import { numero, useCarregar } from './apoio'

/**
 * Simular: quantos entrariam e quanto mandaria, sem executar nada. Com a
 * amostra mascarada de quem entraria e de quem fica de fora em cada motivo
 * (P1, 16/11, como o Klaviyo; o nosso desenho §2.12 já pedia).
 *
 * P2 (16/11):
 *  - hoje ou os próximos 7 dias, dia a dia;
 *  - a conta das mensagens, passo a passo (lembrete + confirmação + aviso);
 *  - a comparação com a automação que já faz isso hoje, antes de trocar.
 */
export function SimularJornada({ open, onClose, jornadaId, versao, apoio }: { open: boolean; onClose: () => void; jornadaId: string; versao: VersaoDaJornada; apoio: ApoioDoEditor }) {
  return (
    <Modal open={open} onClose={onClose} title="Simular: se estivesse publicada" className="max-w-[640px]" footer={<div className="flex justify-end"><Button variant="ghost" onClick={onClose}>Fechar</Button></div>}>
      {/* Montado só com a janela aberta: cada abertura simula o desenho daquele momento. */}
      {open && <ResultadoDaSimulacao jornadaId={jornadaId} versao={versao} apoio={apoio} />}
    </Modal>
  )
}

const reais = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function ResultadoDaSimulacao({ jornadaId, versao, apoio }: { jornadaId: string; versao: VersaoDaJornada; apoio: ApoioDoEditor }) {
  const [periodo, setPeriodo] = useState<'1' | '7'>('1')
  const { dados: r, erro } = useCarregar(() => jornadasApi.simular(jornadaId, versao, { dias: periodo === '7' ? 7 : 1 }), [periodo])
  const [aberto, setAberto] = useState<string | null>(null)

  const topo = (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 flex-1 text-[14px] text-surface-400">{periodo === '1' ? 'Quem entraria hoje e o que receberia.' : 'Os próximos 7 dias, dia a dia.'} Nada é enviado.</p>
      <SegmentedControl label="Período da simulação" size="32" value={periodo} onChange={setPeriodo} options={[{ value: '1', label: 'Hoje' }, { value: '7', label: 'Próximos 7 dias' }]} />
    </div>
  )
  if (erro) return <div className="space-y-4">{topo}<p className="text-sm text-[var(--color-danger)]">{erro}</p></div>
  if (!r) return <div className="space-y-4">{topo}<div className="flex items-center gap-2 text-sm text-surface-400"><Spinner className="w-4 h-4" /> Contando quem entraria…</div></div>
  // Trocou o período e a conta nova ainda não chegou: mostra a anterior, apagada.
  const contando = (r.days ?? 1) !== Number(periodo)
  const semana = periodo === '7' && r.totals && r.byDay
  const cartoes: [string, string][] = semana && r.totals
    ? [
        ['Entrariam em 7 dias', numero(r.totals.wouldEnter)],
        ['Mensagens em 7 dias', numero(r.totals.messages)],
        ['IA em 7 dias', r.totals.credits ? `${r.totals.credits.toLocaleString('pt-BR')} créd.` : 'zero'],
        ['Tarifa da Meta, 7 dias', reais(r.totals.metaCostBrl)],
      ]
    : [
        ['Entrariam hoje', numero(r.wouldEnterToday)],
        ['Mensagens por dia', numero(r.messagesPerDay)],
        ['IA por dia', r.creditsPerDay ? `${r.creditsPerDay.toLocaleString('pt-BR')} créd.` : 'zero'],
        ['Tarifa da Meta/dia', reais(r.metaCostPerDayBrl)],
      ]
  return (
    <div className="space-y-5 text-sm text-surface-200">
      {topo}
      <div className={cn('space-y-5 transition-opacity duration-200', contando && 'opacity-50')} aria-busy={contando}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cartoes.map(([rotulo, valor]) => (
            <div key={rotulo} className="rounded-[10px] bg-surface-800 px-3 py-2.5">
              <p className="text-[12px] text-surface-500">{rotulo}</p>
              <p className="text-[20px] font-semibold text-surface-50 tabular-nums">{valor}</p>
            </div>
          ))}
        </div>

        {semana && r.byDay && <DiaADia dias={r.byDay} />}
        {r.math && r.math.length > 0 && <ContaDasMensagens r={r} />}
        {r.current && <ComparadoComHoje r={r} />}

        {r.enteringSample && r.enteringSample.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-surface-300 mb-1">Quem entraria hoje</p>
            <Expansivel rotulo={`Ver uma amostra (${r.enteringSample.length} de ${numero(r.wouldEnterToday)})`} aberto={aberto === '__entram'} onAlternar={() => setAberto((a) => (a === '__entram' ? null : '__entram'))}>
              <Amostra itens={r.enteringSample} />
            </Expansivel>
          </div>
        )}
        {r.filteredOut.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-surface-300 mb-1">Ficariam de fora pelo filtro hoje</p>
            <ul className="space-y-1">
              {r.filteredOut.map((f) => (
                <li key={f.reason}>
                  {f.sample?.length ? (
                    <Expansivel rotulo={f.reason} extra={numero(f.count)} aberto={aberto === f.reason} onAlternar={() => setAberto((a) => (a === f.reason ? null : f.reason))}>
                      <Amostra itens={f.sample} total={f.count} />
                    </Expansivel>
                  ) : (
                    <span className="flex justify-between gap-3 text-xs"><span className="text-surface-400">{f.reason}</span><span className="tabular-nums text-surface-200">{numero(f.count)}</span></span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-surface-300 mb-1">Por linha de WhatsApp</p>
          <ul className="space-y-1">
            {r.byLine.map((l) => <li key={l.whatsappNumberId} className="flex justify-between gap-3 text-xs"><span className="text-surface-400">{apoio.whatsappNumbers.find((w) => w.id === l.whatsappNumberId)?.name ?? l.whatsappNumberId}</span><span className="tabular-nums text-surface-200">{numero(l.messages)} msg/dia</span></li>)}
          </ul>
        </div>
        <p className="text-[12px] text-surface-500">Estimativa. A tarifa da Meta depende da categoria do modelo e é cobrada pela Meta. O ritmo por linha espalha os envios ao longo do horário de atendimento.</p>
      </div>
    </div>
  )
}

/** Os próximos 7 dias: quantos entram em cada um (barras simples, sem eixo). */
function DiaADia({ dias }: { dias: NonNullable<Resultado['byDay']> }) {
  const maior = Math.max(1, ...dias.map((d) => d.wouldEnter))
  const rotulo = (iso: string, i: number) => {
    if (i === 0) return 'hoje'
    const d = new Date(`${iso}T12:00:00`)
    return `${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')} ${d.getDate()}`
  }
  return (
    <div>
      <p className="text-xs font-semibold text-surface-300 mb-2">Quantos entrariam por dia</p>
      <ul className="flex h-[120px] items-end gap-2" aria-label="Quantos entrariam em cada um dos próximos 7 dias">
        {dias.map((d, i) => (
          <li key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${numero(d.wouldEnter)} pessoas · ${numero(d.messages)} mensagens`}>
            <span className="text-[12px] tabular-nums text-surface-200">{numero(d.wouldEnter)}</span>
            <span className={cn('w-full rounded-[4px]', i === 0 ? 'bg-brand-500' : 'bg-surface-600')} style={{ height: `${Math.max(3, Math.round((d.wouldEnter / maior) * 72))}px` }} aria-hidden />
            <span className="text-[12px] text-surface-500">{rotulo(d.date, i)}</span>
            <span className="sr-only">{numero(d.wouldEnter)} pessoas e {numero(d.messages)} mensagens</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A conta das mensagens de um dia: passo a passo, de onde sai cada número. */
function ContaDasMensagens({ r }: { r: Resultado }) {
  const linhas = r.math ?? []
  const paraContatos = linhas.filter((m) => !m.internal)
  return (
    <div>
      <p className="text-xs font-semibold text-surface-300 mb-1">A conta das mensagens de hoje</p>
      <ul className="divide-y divide-surface-700 rounded-[10px] bg-surface-800">
        {linhas.map((m) => (
          <li key={m.nodeId} className="flex items-start gap-3 px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] text-surface-100">{m.title}{m.internal && <span className="ml-2 rounded-[6px] jt-cinza px-1.5 py-0.5 text-[12px] font-medium">aviso interno</span>}</span>
              <span className="block text-[12px] leading-snug text-surface-400">
                {m.via ? (m.via === 'mais de um caminho' ? 'Chega por mais de um caminho' : `Só quem segue por ${m.via}`) : 'Todos que entram'}
                {` · ${numero(r.wouldEnterToday)} × ${m.reachPct}%`}
                {m.groupedPeople !== undefined && ` = ${numero(m.groupedPeople)} pessoas numa lista do dia`}
                {m.internal && ' · não conta na tarifa'}
              </span>
            </span>
            <span className="shrink-0 text-[14px] font-semibold tabular-nums text-surface-50">{numero(m.messages)}</span>
          </li>
        ))}
        <li className="flex items-center gap-3 px-3 py-2">
          <span className="min-w-0 flex-1 text-[12px] text-surface-400">
            {paraContatos.length > 1 ? `${paraContatos.map((m) => numero(m.messages)).join(' + ')} = ` : ''}mensagens para os contatos
          </span>
          <span className="shrink-0 text-[14px] font-semibold tabular-nums text-surface-50">{numero(r.messagesPerDay)}</span>
        </li>
      </ul>
      <p className="mt-1 text-[12px] text-surface-500">As porcentagens vêm dos últimos 30 dias desta jornada (ou de jornadas parecidas, se ela é nova).</p>
    </div>
  )
}

/** Lado a lado com a automação que já roda hoje para o mesmo público. */
function ComparadoComHoje({ r }: { r: Resultado }) {
  const atual = r.current!
  const diferenca = r.messagesPerDay - atual.messagesPerDay
  const pct = atual.messagesPerDay ? Math.round((diferenca / atual.messagesPerDay) * 100) : 0
  return (
    <div>
      <p className="text-xs font-semibold text-surface-300 mb-1">Comparado com o que já roda hoje</p>
      <div className="grid grid-cols-2 gap-3">
        {([[atual.name, atual.wouldEnterToday, atual.messagesPerDay, false], ['Com esta jornada', r.wouldEnterToday, r.messagesPerDay, true]] as const).map(([nome, pessoas, msgs, nova]) => (
          <div key={nome} className={cn('rounded-[10px] px-3 py-2.5', nova ? 'jt-teal' : 'bg-surface-800')}>
            <p className={cn('text-[12px]', nova ? 'font-semibold' : 'text-surface-400')}>{nome}</p>
            <p className={cn('mt-0.5 text-[14px] tabular-nums', !nova && 'text-surface-100')}>{numero(pessoas)} pessoas · <strong>{numero(msgs)}</strong> mensagens por dia</p>
          </div>
        ))}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-surface-400">
        <span className={cn('rounded-[6px] px-1.5 py-0.5 font-semibold tabular-nums', diferenca < 0 ? 'jt-verde' : diferenca > 0 ? 'jt-ambar' : 'jt-cinza')}>
          {diferenca === 0 ? 'Mesmo volume' : `${diferenca > 0 ? '+' : '−'}${numero(Math.abs(diferenca))} mensagens por dia (${diferenca > 0 ? '+' : '−'}${Math.abs(pct)}%)`}
        </span>
        {atual.note}
      </p>
    </div>
  )
}

function Expansivel({ rotulo, extra, aberto, onAlternar, children }: { rotulo: string; extra?: string; aberto: boolean; onAlternar: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] bg-surface-800">
      <button type="button" onClick={onAlternar} aria-expanded={aberto} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs cursor-pointer hover:bg-[var(--rowhover)] rounded-[8px]">
        <span className="flex-1 text-surface-200">{rotulo}</span>
        {extra && <span className="tabular-nums text-surface-200">{extra}</span>}
        <ChevronDown className={cn('h-3.5 w-3.5 text-surface-500 transition-transform duration-200', aberto && 'rotate-180')} aria-hidden />
      </button>
      {aberto && <div className="jornadas-aparecer px-3 pb-2.5">{children}</div>}
    </div>
  )
}

/** Uma amostra mascarada (nome curto e telefone com ••••), nunca a lista inteira. */
function Amostra({ itens, total }: { itens: ContatoMascarado[]; total?: number }) {
  return (
    <>
      <ul className="divide-y divide-surface-700">
        {itens.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-1.5 text-xs">
            <span className="text-surface-100">{c.name}<span className="ml-2 tabular-nums text-surface-500">{c.phoneMasked}</span></span>
            {c.detail && <span className="text-surface-400">{c.detail}</span>}
          </li>
        ))}
      </ul>
      {total !== undefined && total > itens.length && <p className="pt-1 text-[12px] text-surface-500">Mostrando {itens.length} de {numero(total)}.</p>}
    </>
  )
}
