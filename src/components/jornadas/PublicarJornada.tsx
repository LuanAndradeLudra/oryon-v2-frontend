import { useEffect, useState, type ReactNode } from 'react'
import { CalendarClock, CircleAlert, Eye, Ghost, Rocket, Send, UserPlus, Users } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { ehConfirmacao, jornadasApi } from '@/services/jornadas/jornadasApi'
import type { ConfirmacaoNecessaria, DestinoAoPublicar, Jornada } from '@/services/jornadas/tipos'
import type { DiferencasDoDesenho } from '@/services/jornadas/diff'
import { numero } from './apoio'
import { Selo } from './comum'

/**
 * Publicar e retomar em DUAS ETAPAS, como as ações críticas da v1 (ORY-11):
 * 1) escolher o modo e pedir a prévia (o que vai acontecer + token de 10 min);
 * 2) confirmar a mesma ação com o token. Pausar é seguro e fica fora daqui.
 */
/** "2026-11-20T08:00" (o campo da tela) a partir de agora + N horas, na hora cheia. */
function daquiA(horas: number): string {
  const d = new Date(Date.now() + horas * 3_600_000)
  d.setMinutes(0, 0, 0)
  const z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:00`
}
const quandoEmTexto = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function PublicarJornada({ open, acao, modoInicial, notaInicial, onClose, jornada, erros, conferencia, mudancas, onVerMudancas, salvarAntes, onPronto }: {
  open: boolean
  acao: 'publicar' | 'retomar'
  /** Abrir já com o modo escolhido (ex.: "Pôr em sombra" no menu do Publicar). */
  modoInicial?: 'shadow' | 'active'
  /** A nota de quem pediu a aprovação (o administrador publica com ela). */
  notaInicial?: string
  onClose: () => void
  jornada: Jornada
  erros: number
  /** A lista de problemas e avisos do desenho (a conferência saiu do cabeçalho em 16/11 e mora aqui). */
  conferencia?: ReactNode
  /** O que mudou desde a versão no ar (P1, 16/11), calculado ao vivo no editor. */
  mudancas?: DiferencasDoDesenho | null
  /** "Ver no desenho": fecha a janela e destaca as mudanças no canvas. */
  onVerMudancas?: () => void
  salvarAntes: () => Promise<Jornada>
  onPronto: (j: Jornada) => void
}) {
  const { toast } = useToast()
  const [modo, setModo] = useState<'shadow' | 'active'>(jornada.publishedVersion ? 'active' : 'shadow')
  const [previa, setPrevia] = useState<ConfirmacaoNecessaria | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)
  /** Inscrever também quem já se encaixa hoje (porta de segmento ou evento). Padrão: não. */
  const [backfill, setBackfill] = useState(false)
  // P2 (16/11): nota da versão, agendar, desligar numa data e o destino de quem já está dentro.
  const [nota, setNota] = useState('')
  const [quando, setQuando] = useState<'agora' | 'agendar'>('agora')
  const [dataAgendada, setDataAgendada] = useState(() => daquiA(16))
  const [desligar, setDesligar] = useState(false)
  const [dataFim, setDataFim] = useState(() => daquiA(24 * 30).slice(0, 10))
  const [destino, setDestino] = useState<DestinoAoPublicar>('finish_old')
  const mudancaComGenteDentro = acao === 'publicar' && !!jornada.publishedVersion && jornada.enrolledNow > 0
  const passosQueSairam = mudancas?.passos.filter((m) => m.tipo === 'saiu') ?? []

  useEffect(() => {
    if (!open) return
    setPrevia(null)
    setFalha(null)
    setBackfill(false)
    setNota(notaInicial ?? '')
    setQuando('agora')
    setDesligar(!!jornada.endsAt)
    setDestino('finish_old')
    // Nunca publicada: começa em sombra. Já rodando: publicar mudanças mantém ativa (ou vira, se estava em sombra).
    setModo(modoInicial ?? (jornada.publishedVersion ? 'active' : 'shadow'))
  }, [open, jornada.publishedVersion, jornada.endsAt, modoInicial, notaInicial])

  const pedirPrevia = async () => {
    setOcupado(true)
    setFalha(null)
    try {
      await salvarAntes()
      const r = acao === 'retomar' ? await jornadasApi.retomar(jornada.id) : await jornadasApi.publicar(jornada.id, modo)
      if (ehConfirmacao(r)) setPrevia(r)
      else onPronto(r)
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível pedir a prévia.')
    } finally {
      setOcupado(false)
    }
  }

  const confirmar = async () => {
    if (!previa) return
    setOcupado(true)
    setFalha(null)
    try {
      const comBackfill = acao === 'publicar' && backfill && !!previa.preview.backfill
      const agendada = acao === 'publicar' && quando === 'agendar' ? new Date(dataAgendada).toISOString() : null
      const r = acao === 'retomar'
        ? await jornadasApi.retomar(jornada.id, previa.confirmationToken)
        : await jornadasApi.publicar(jornada.id, modo, previa.confirmationToken, {
            backfill: comBackfill,
            note: nota,
            scheduleAt: agendada,
            endsAt: desligar ? new Date(`${dataFim}T23:59`).toISOString() : null,
            inFlight: mudancaComGenteDentro ? destino : undefined,
          })
      if (ehConfirmacao(r)) { setPrevia(r); return }
      const extra = comBackfill ? ` ${numero(previa.preview.backfill!.eligible)} pessoas que já se encaixavam foram inscritas.` : ''
      toast(acao === 'retomar' ? 'Jornada retomada.'
        : agendada ? `Agendada: publica sozinha em ${quandoEmTexto(agendada)}.`
          : modo === 'shadow' ? `Publicada em sombra (v${r.publishedVersion}). Nada é enviado.${extra}` : `Publicada e ativa (v${r.publishedVersion}).${extra}`, 'success')
      onPronto(r)
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível publicar.')
    } finally {
      setOcupado(false)
    }
  }

  const pedirAprovacao = async () => {
    setOcupado(true)
    setFalha(null)
    try {
      await salvarAntes()
      const r = await jornadasApi.pedirAprovacao(jornada.id, { mode: modo, note: nota })
      toast('Pedido enviado. Um administrador vê o que muda e publica.', 'success')
      onPronto(r)
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não deu para pedir a aprovação.')
    } finally {
      setOcupado(false)
    }
  }

  const titulo = acao === 'retomar' ? 'Retomar a jornada' : jornada.publishedVersion ? 'Publicar as mudanças' : 'Publicar a jornada'
  const p = previa?.preview

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {previa && <span className="mr-auto text-[12px] text-surface-500">A prévia vale até {new Date(previa.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</span>}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          {!previa && acao === 'publicar' && (
            <Button variant="secondary" leftIcon={<Send className="w-4 h-4" />} onClick={pedirAprovacao} loading={ocupado} disabled={erros > 0} title="Um administrador vê o que muda e publica">Pedir aprovação</Button>
          )}
          {!previa
            ? <Button onClick={pedirPrevia} loading={ocupado} disabled={erros > 0 && acao === 'publicar'}>Ver a prévia</Button>
            : <Button onClick={confirmar} loading={ocupado} leftIcon={acao === 'publicar' && quando === 'agendar' ? <CalendarClock className="w-4 h-4" /> : modo === 'shadow' && acao === 'publicar' ? <Ghost className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}>
                {acao === 'retomar' ? 'Confirmar e retomar' : quando === 'agendar' ? 'Confirmar o agendamento' : modo === 'shadow' ? 'Confirmar e pôr em sombra' : 'Confirmar e ativar'}
              </Button>}
        </div>
      }
    >
      <div className="space-y-4 text-sm text-surface-200">
        {acao === 'publicar' && conferencia && (
          <div className="space-y-2">
            <p className={cn('flex items-start gap-2 rounded-[8px] px-3 py-2', erros > 0 ? 'jt-vermelho' : 'jt-ambar')}>
              <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
              {erros > 0
                ? `${erros} problema${erros > 1 ? 's impedem' : ' impede'} a publicação. Clique num deles para ir ao passo.`
                : 'Só avisos: dá para publicar, mas vale conferir.'}
            </p>
            <div className="max-h-[240px] overflow-y-auto">{conferencia}</div>
          </div>
        )}

        {acao === 'publicar' && !previa && jornada.publishedVersion && mudancas && (
          <div className="rounded-[10px] bg-surface-800 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-semibold text-surface-100">
                {mudancas.total ? `O que muda desde a v${jornada.publishedVersion}` : `Nada mudou desde a v${jornada.publishedVersion}`}
              </p>
              {mudancas.passos.some((m) => m.tipo !== 'saiu') && onVerMudancas && (
                <Button variant="ghost" size="sm" leftIcon={<Eye className="w-4 h-4" />} onClick={onVerMudancas}>Ver no desenho</Button>
              )}
            </div>
            {mudancas.total > 0 && (
              <ul className="mt-1.5 max-h-[168px] space-y-1 overflow-y-auto">
                {mudancas.passos.map((m) => (
                  <li key={m.tipo + m.nodeId} className="flex items-start gap-2 text-[14px] leading-snug text-surface-200">
                    <Selo tom={m.tipo === 'novo' ? 'verde' : m.tipo === 'mudou' ? 'ambar' : 'vermelho'} className="mt-px shrink-0">{m.tipo === 'novo' ? 'Novo' : m.tipo === 'mudou' ? 'Mudou' : 'Saiu'}</Selo>
                    <span className="min-w-0">{m.nome}{m.detalhes.length ? <span className="text-surface-400"> · {m.detalhes.join(', ')}</span> : null}</span>
                  </li>
                ))}
                {mudancas.outras.map((o) => <li key={o} className="text-[14px] leading-snug text-surface-300">· {o}</li>)}
              </ul>
            )}
            {!mudancas.total && <p className="mt-1 text-[12px] text-surface-400">Publicar de novo só muda o modo.</p>}
          </div>
        )}

        {acao === 'publicar' && !previa && (
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Como publicar">
            {([
              ['shadow', 'Em sombra', 'Roda de verdade, mas não envia nada: cada passo grava o que teria feito. Use para comparar com o n8n antes de virar.', Ghost],
              ['active', 'Ativa', 'Começa a enviar. Quem entrar a partir de agora segue esta versão; quem já está dentro continua na versão em que entrou.', Rocket],
            ] as const).map(([valor, rotulo, texto, Icone]) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={modo === valor}
                onClick={() => setModo(valor)}
                className={cn('text-left rounded-[10px] border px-3 py-3 transition-colors', modo === valor ? 'border-brand-500 bg-[var(--color-accent-soft)]' : 'border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)]')}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-surface-50"><Icone className="w-4 h-4" aria-hidden />{rotulo}</span>
                <span className="mt-1 block text-xs text-surface-400 leading-relaxed">{texto}</span>
              </button>
            ))}
          </div>
        )}

        {acao === 'publicar' && !previa && (
          <div className="space-y-4">
            {mudancaComGenteDentro && (
              <div>
                <p className="mb-2 text-xs font-semibold text-surface-300">E as {numero(jornada.enrolledNow)} pessoas que já estão dentro?</p>
                <div className="space-y-1.5" role="radiogroup" aria-label="Quem já está dentro">
                  {([
                    ['finish_old', `Terminam na v${jornada.publishedVersion} (padrão)`, 'Seguem o desenho em que entraram. Só quem entrar depois usa a versão nova.'],
                    ['migrate', 'Passam para a versão nova', passosQueSairam.length ? `No próximo passo, seguem pelo desenho novo. Quem estiver em passo que saiu (${passosQueSairam.map((m) => m.nome).join(', ')}) termina na v${jornada.publishedVersion}.` : 'No próximo passo, seguem pelo desenho novo.'],
                    ['exit', 'Saem agora', 'As inscrições abertas terminam com o motivo "nova versão". Use quando o desenho antigo estava errado.'],
                  ] as const).map(([v, rotulo, texto]) => (
                    <button key={v} type="button" role="radio" aria-checked={destino === v} onClick={() => setDestino(v)}
                      className={cn('w-full text-left rounded-[10px] border px-3 py-2 transition-colors cursor-pointer', destino === v ? 'border-brand-500 bg-[var(--color-accent-soft)]' : 'border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)]')}>
                      <span className="block text-sm font-semibold text-surface-50">{rotulo}</span>
                      <span className="block text-xs leading-relaxed text-surface-400">{texto}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-surface-300">Nota da versão <span className="font-normal text-surface-500">(opcional)</span></span>
              <Input size="sm" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: lembrete às 11h em vez de 9h; texto da confirmação novo" />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-surface-300">Quando</span>
              <div className="inline-flex rounded-[8px] bg-surface-800 p-0.5" role="radiogroup" aria-label="Quando publicar">
                {([['agora', 'Agora'], ['agendar', 'Agendar']] as const).map(([v, r]) => (
                  <button key={v} type="button" role="radio" aria-checked={quando === v} onClick={() => setQuando(v)}
                    className={cn('h-7 rounded-[6px] px-3 text-xs font-semibold transition-colors cursor-pointer', quando === v ? 'bg-surface-900 text-surface-50 shadow-[0_1px_2px_rgba(0,0,0,0.18)]' : 'text-surface-400 hover:text-surface-100')}>{r}</button>
                ))}
              </div>
              {quando === 'agendar' && <Input size="sm" type="datetime-local" className="w-auto" value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} aria-label="Data e hora da publicação" />}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Switch checked={desligar} onChange={setDesligar} aria-label="Desligar sozinha numa data" />
              <span className="text-xs text-surface-300">Desligar sozinha em</span>
              {desligar && <Input size="sm" type="date" className="w-auto" value={dataFim} onChange={(e) => setDataFim(e.target.value)} aria-label="Data em que a jornada é pausada" />}
              {!desligar && <span className="text-xs text-surface-500">(ex.: fim de uma campanha)</span>}
            </div>
          </div>
        )}

        {acao === 'retomar' && !previa && <p className="text-surface-300">A jornada volta a aceitar inscrições na versão publicada (v{jornada.publishedVersion}).</p>}

        {p && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-surface-300">O que vai acontecer</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                ['Versão', p.fromVersion ? `v${p.fromVersion} → v${p.toVersion}` : `v${p.toVersion}`],
                ['Entram hoje', numero(p.wouldEnterToday)],
                ['Mensagens por dia', p.mode === 'shadow' ? '0 (sombra)' : numero(p.messagesPerDay)],
                ['IA por inscrição', p.estimatedCreditsPerEnrollment ? `${p.estimatedCreditsPerEnrollment.toLocaleString('pt-BR')} créd.` : 'zero'],
                ['Linhas', p.whatsappNumbers.join(', ') || '—'],
                ['Ficam na versão antiga', numero(p.enrolledInPreviousVersions)],
              ].map(([r, v]) => (
                <div key={r} className="rounded-[8px] bg-surface-800 px-3 py-2">
                  <p className="text-[12px] text-surface-500">{r}</p>
                  <p className="text-sm font-semibold text-surface-50 break-words">{v}</p>
                </div>
              ))}
            </div>
            {p.changes.length > 0 && <ul className="list-disc pl-5 space-y-0.5 text-xs text-surface-300">{p.changes.map((c) => <li key={c}>{c}</li>)}</ul>}
            {acao === 'publicar' && p.backfill && (
              <div>
                <p className="mb-2 text-xs font-semibold text-surface-300">Quem já se encaixa hoje</p>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Inscrever quem já se encaixa hoje">
                  {([
                    [false, 'Só quem entrar daqui em diante', 'A jornada começa a contar a partir da publicação.', Users],
                    [true, `Inscrever também ${numero(p.backfill.eligible)} pessoas`, p.backfill.description, UserPlus],
                  ] as const).map(([valor, rotulo, texto, Icone]) => (
                    <button key={String(valor)} type="button" role="radio" aria-checked={backfill === valor} onClick={() => setBackfill(valor)}
                      className={cn('text-left rounded-[10px] border px-3 py-2.5 transition-colors cursor-pointer', backfill === valor ? 'border-brand-500 bg-[var(--color-accent-soft)]' : 'border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)]')}>
                      <span className="flex items-center gap-2 text-sm font-semibold text-surface-50"><Icone className="w-4 h-4" aria-hidden />{rotulo}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-surface-400">{texto}</span>
                    </button>
                  ))}
                </div>
                {backfill && p.mode === 'active' && <p className="mt-2 text-xs text-surface-400">Elas recebem a primeira mensagem dentro da janela de envio da jornada.</p>}
              </div>
            )}
            {acao === 'publicar' && (quando === 'agendar' || desligar || nota.trim()) && (
              <ul className="space-y-1 text-xs text-surface-300">
                {quando === 'agendar' && <li>• Publica sozinha em {quandoEmTexto(dataAgendada)}. Até lá, nada muda.</li>}
                {desligar && <li>• Pausa sozinha em {new Date(`${dataFim}T12:00`).toLocaleDateString('pt-BR')}.</li>}
                {nota.trim() && <li>• Nota da versão: “{nota.trim()}”.</li>}
              </ul>
            )}
            {p.warnings.length > 0 && <ul className="space-y-1 text-xs text-surface-400">{p.warnings.map((w) => <li key={w}>• {w}</li>)}</ul>}
          </div>
        )}

        {falha && <p className="text-sm text-[var(--color-danger)]">{falha}</p>}
        <p className="text-[12px] text-surface-500">Nada muda antes da confirmação. Só administradores publicam e retomam jornadas.</p>
      </div>
    </Modal>
  )
}
