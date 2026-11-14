import { CircleAlert, Copy, Plus, Trash2, TriangleAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'
import type { ApoioDoEditor, Catalogo, Entrada, Metas, Porta, ProblemaDoDesenho, VersaoDaJornada } from '@/services/jornadas/tipos'
import { passoDoCatalogo, ROTULO_DO_GRUPO } from '@/services/jornadas/catalogo'
import { ID_DA_ENTRADA } from '@/services/jornadas/layout'
import { IconeDoCatalogo, Selo } from '../comum'
import { CampoDoPassoEditor, EditorDeCondicoes, Rotulo } from './Campos'
import { OPCOES_DE_PORTA } from './resumo'

/**
 * O painel da direita. Mostra o passo escolhido; com a entrada escolhida, as
 * portas, o filtro e a reentrada; sem nada escolhido, a jornada (meta contínua,
 * saídas automáticas e prazo).
 */

interface Props {
  versao: VersaoDaJornada
  selecionado: string | null
  catalogo: Catalogo
  apoio: ApoioDoEditor
  problemas: ProblemaDoDesenho[]
  nome: string
  descricao: string
  onMudarVersao: (v: VersaoDaJornada) => void
  onMudarNome: (nome: string, descricao: string) => void
  onApagar: (id: string) => void
  onDuplicar: (id: string) => void
  onFechar: () => void
  somenteLeitura: boolean
}

export function PainelDoPasso(props: Props & { className?: string }) {
  const { selecionado } = props
  return (
    <aside className={cn('w-[340px] shrink-0 border-l border-surface-700 bg-surface-900 overflow-y-auto', props.className)} aria-label="Painel do passo">
      {selecionado === ID_DA_ENTRADA ? <PainelDaEntrada {...props} /> : selecionado && props.versao.graph.nodes[selecionado] ? <PainelDeUmPasso {...props} id={selecionado} /> : <PainelDaJornada {...props} />}
    </aside>
  )
}

function Cabecalho({ titulo, sub, onFechar, children }: { titulo: string; sub?: React.ReactNode; onFechar?: () => void; children?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 bg-surface-900 border-b border-surface-700 px-4 py-3">
      <div className="flex items-start gap-2">
        {children}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-surface-50">{titulo}</p>
          {sub && <div className="mt-0.5 text-xs text-surface-400">{sub}</div>}
        </div>
        {onFechar && <Button variant="ghost" size="sm" iconOnly aria-label="Fechar o painel" onClick={onFechar}><X className="w-4 h-4" /></Button>}
      </div>
    </div>
  )
}

function ListaDeProblemas({ problemas }: { problemas: ProblemaDoDesenho[] }) {
  if (!problemas.length) return null
  return (
    <ul className="space-y-1.5">
      {problemas.map((p, i) => (
        <li key={i} className={cn('flex items-start gap-2 rounded-[8px] px-2.5 py-2 text-xs', p.severity === 'error' ? 'bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-surface-800))] text-surface-100' : 'bg-surface-800 text-surface-300')}>
          {p.severity === 'error' ? <CircleAlert className="w-3.5 h-3.5 mt-px shrink-0 text-[var(--color-danger)]" aria-hidden /> : <TriangleAlert className="w-3.5 h-3.5 mt-px shrink-0 text-status-pending" aria-hidden />}
          <span>{p.message}</span>
        </li>
      ))}
    </ul>
  )
}

// ── um passo ─────────────────────────────────────────────────────────────────

function PainelDeUmPasso({ id, versao, catalogo, apoio, problemas, onMudarVersao, onApagar, onDuplicar, onFechar, somenteLeitura }: Props & { id: string }) {
  const no = versao.graph.nodes[id]
  const passo = passoDoCatalogo(catalogo, no.type)
  const mudarNo = (parcial: Partial<typeof no>) => onMudarVersao({ ...versao, graph: { ...versao.graph, nodes: { ...versao.graph.nodes, [id]: { ...no, ...parcial } } } })
  const mudarParam = (chave: string, valor: unknown) => mudarNo({ params: { ...no.params, [chave]: valor } })

  return (
    <>
      <Cabecalho titulo={passo?.label ?? no.type} sub={passo ? ROTULO_DO_GRUPO[passo.group] : undefined} onFechar={onFechar}>
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] bg-surface-800 text-surface-100 shrink-0"><IconeDoCatalogo nome={passo?.icon} className="w-4 h-4" /></span>
      </Cabecalho>
      <div className="px-4 py-4 space-y-4">
        {passo && <p className="text-xs text-surface-400 leading-relaxed">{passo.description}</p>}
        {passo && (
          <div className="flex flex-wrap gap-1.5">
            <Selo tom={passo.cost.credits > 0 ? 'violeta' : 'cinza'}>Custo: {passo.cost.label}</Selo>
            {passo.requires.includes('window_24h') && <Selo tom="ambar">Precisa da janela de 24 h</Selo>}
            {passo.requires.includes('connector') && <Selo tom="azul">Usa o sistema da clínica</Selo>}
          </div>
        )}
        <ListaDeProblemas problemas={problemas.filter((p) => p.nodeId === id)} />
        <label className="block">
          <Rotulo texto="Nome no canvas" ajuda="Opcional. Ajuda a ler o desenho." />
          <Input size="sm" value={no.label ?? ''} placeholder={passo?.label} disabled={somenteLeitura} onChange={(e) => mudarNo({ label: e.target.value || undefined })} />
        </label>
        {(passo?.params ?? [])
          .filter((c) => !c.showIf || no.params[c.showIf.key] === c.showIf.equals)
          .map((campo) => (
            <CampoDoPassoEditor
              key={campo.key}
              campo={campo}
              valor={no.params[campo.key]}
              params={no.params}
              onChange={(v) => mudarParam(campo.key, v)}
              catalogo={catalogo}
              apoio={apoio}
              somenteLeitura={somenteLeitura}
            />
          ))}
        {!somenteLeitura && (
          <div className="pt-2 flex gap-2 border-t border-surface-700">
            <Button variant="secondary" size="sm" leftIcon={<Copy className="w-3.5 h-3.5" />} onClick={() => onDuplicar(id)}>Duplicar</Button>
            <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => onApagar(id)}>Apagar passo</Button>
          </div>
        )}
      </div>
    </>
  )
}

// ── a entrada ────────────────────────────────────────────────────────────────

const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']

const PARAMS_PADRAO: Record<Porta['type'], Record<string, unknown>> = {
  schedule_list: { time: '09:00', operation: 'agenda_do_dia', dayOffset: 1, weekdays: ['seg', 'ter', 'qua', 'qui', 'sex'] },
  event: { event: 'appointment_cancelled' },
  segment: { segment: 'Etiqueta "Paciente"', schedule: 'toda segunda, 10h' },
  webhook: { name: 'Formulário do site' },
  manual: {},
}

function PainelDaEntrada({ versao, catalogo, problemas, onMudarVersao, onFechar, somenteLeitura }: Props) {
  const entrada = versao.entry
  const mudar = (e: Entrada) => onMudarVersao({ ...versao, entry: e })
  const mudarPorta = (i: number, p: Porta) => mudar({ ...entrada, doors: entrada.doors.map((d, j) => (j === i ? p : d)) })
  const dis = somenteLeitura

  return (
    <>
      <Cabecalho titulo="Entrada" sub="Como as pessoas entram, quem pode entrar e se pode entrar de novo." onFechar={onFechar} />
      <div className="px-4 py-4 space-y-5">
        <ListaDeProblemas problemas={problemas.filter((p) => p.code === 'no_door' || p.code === 'no_start')} />
        <section className="space-y-2">
          <p className="text-xs font-semibold text-surface-200">Portas de entrada</p>
          {entrada.doors.map((porta, i) => (
            <div key={porta.id} className="rounded-[8px] bg-surface-800 p-2.5 space-y-2">
              <div className="flex gap-1.5">
                <Select size="sm" value={porta.type} disabled={dis} onChange={(e) => { const t = e.target.value as Porta['type']; mudarPorta(i, { ...porta, type: t, params: { ...PARAMS_PADRAO[t] } }) }} aria-label="Tipo de porta">
                  {OPCOES_DE_PORTA.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
                {!dis && <Button variant="ghost" size="sm" iconOnly aria-label="Tirar porta" onClick={() => mudar({ ...entrada, doors: entrada.doors.filter((_, j) => j !== i) })}><Trash2 className="w-3.5 h-3.5" /></Button>}
              </div>
              <ParametrosDaPorta porta={porta} catalogo={catalogo} disabled={dis} onChange={(params) => mudarPorta(i, { ...porta, params })} />
            </div>
          ))}
          {!dis && (
            <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => mudar({ ...entrada, doors: [...entrada.doors, { id: `p_${Math.random().toString(36).slice(2, 7)}`, type: 'event', params: { ...PARAMS_PADRAO.event } }] })}>
              Porta
            </Button>
          )}
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold text-surface-200">Quem pode entrar (filtro)</p>
          <EditorDeCondicoes grupo={entrada.criteria} onChange={(g) => mudar({ ...entrada, criteria: g })} catalogo={catalogo} disabled={dis} />
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold text-surface-200">Entrar de novo</p>
          <Select size="sm" value={entrada.reentry.mode} disabled={dis} onChange={(e) => mudar({ ...entrada, reentry: { ...entrada.reentry, mode: e.target.value as Entrada['reentry']['mode'] } })} aria-label="Regra de reentrada">
            <option value="per_subject">Uma inscrição por assunto (ex.: por consulta)</option>
            <option value="once">Só uma vez por pessoa</option>
            <option value="cooldown">De novo depois de alguns dias</option>
            <option value="always">Pode entrar a cada vez</option>
          </Select>
          {entrada.reentry.mode === 'per_subject' && (
            <label className="block">
              <Rotulo texto="Chave do assunto" ajuda="O que torna cada inscrição única. Ex.: o id do agendamento." />
              <Input size="sm" value={entrada.reentry.subjectKey ?? ''} disabled={dis} onChange={(e) => mudar({ ...entrada, reentry: { ...entrada.reentry, subjectKey: e.target.value } })} />
            </label>
          )}
          {entrada.reentry.mode === 'cooldown' && (
            <label className="block">
              <Rotulo texto="Depois de quantos dias" />
              <Input size="sm" type="number" min={1} value={entrada.reentry.cooldownDays ?? 30} disabled={dis} onChange={(e) => mudar({ ...entrada, reentry: { ...entrada.reentry, cooldownDays: Number(e.target.value) } })} />
            </label>
          )}
        </section>
      </div>
    </>
  )
}

function ParametrosDaPorta({ porta, catalogo, onChange, disabled }: { porta: Porta; catalogo: Catalogo; onChange: (p: Record<string, unknown>) => void; disabled?: boolean }) {
  const p = porta.params
  const set = (k: string, v: unknown) => onChange({ ...p, [k]: v })
  switch (porta.type) {
    case 'schedule_list': {
      const dias = (Array.isArray(p.weekdays) ? p.weekdays : []) as string[]
      return (
        <div className="space-y-2">
          <label className="block">
            <Rotulo texto="Lista do sistema da clínica" />
            <Select size="sm" value={String(p.operation ?? '')} disabled={disabled} onChange={(e) => set('operation', e.target.value)}>
              {catalogo.connectorOperations.filter((o) => o.kind === 'list').map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </Select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><Rotulo texto="Horário" /><Input size="sm" type="time" value={String(p.time ?? '09:00')} disabled={disabled} onChange={(e) => set('time', e.target.value)} /></label>
            <label className="block"><Rotulo texto="Dias à frente" /><Input size="sm" type="number" min={0} value={Number(p.dayOffset ?? 1)} disabled={disabled} onChange={(e) => set('dayOffset', Number(e.target.value))} /></label>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Dias da semana">
            {DIAS.map((d) => {
              const ligado = dias.includes(d)
              return (
                <button key={d} type="button" disabled={disabled} aria-pressed={ligado}
                  onClick={() => set('weekdays', ligado ? dias.filter((x) => x !== d) : [...dias, d])}
                  className={cn('h-6 px-2 rounded-[6px] text-[11px] font-semibold transition-colors', ligado ? 'bg-[var(--color-accent-soft)] text-brand-500' : 'bg-surface-700 text-surface-400')}>
                  {d}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-surface-500">No fuso da unidade. Cada item da lista acha ou cria o contato e entra com a chave do assunto.</p>
        </div>
      )
    }
    case 'event':
      return (
        <label className="block">
          <Rotulo texto="Quando acontecer" />
          <Select size="sm" value={String(p.event ?? '')} disabled={disabled} onChange={(e) => set('event', e.target.value)}>
            {catalogo.events.map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
          </Select>
        </label>
      )
    case 'segment':
      return (
        <div className="space-y-2">
          <label className="block"><Rotulo texto="Quem (segmento das campanhas)" /><Input size="sm" value={String(p.segment ?? '')} disabled={disabled} onChange={(e) => set('segment', e.target.value)} /></label>
          <label className="block"><Rotulo texto="Quando" /><Input size="sm" value={String(p.schedule ?? '')} disabled={disabled} onChange={(e) => set('schedule', e.target.value)} /></label>
        </div>
      )
    case 'webhook':
      return (
        <div className="space-y-2">
          <label className="block"><Rotulo texto="Nome da porta" /><Input size="sm" value={String(p.name ?? '')} disabled={disabled} onChange={(e) => set('name', e.target.value)} /></label>
          <p className="text-[11px] text-surface-500">O endereço (/v1/hooks/…) e o segredo aparecem ao publicar. "Ouvir um exemplo" mapeia telefone, id e variáveis sem digitar nome de campo.</p>
          <Button variant="secondary" size="sm" disabled title="Chega com a API de jornadas (ORY-61)">Ouvir um exemplo</Button>
        </div>
      )
    case 'manual':
      return <p className="text-[11px] text-surface-500">Inscrever contatos na tela ou pela API (POST /v1/journeys/{'{id}'}/enrollments).</p>
  }
}

// ── a jornada ────────────────────────────────────────────────────────────────

const EVENTOS_DE_SAIDA = [
  { key: 'time.subject_passed', label: 'O assunto passou (ex.: a consulta já aconteceu)' },
  { key: 'contact.opted_out', label: 'Pediu para não receber' },
]

function PainelDaJornada({ versao, catalogo, problemas, nome, descricao, onMudarVersao, onMudarNome, somenteLeitura }: Props) {
  const metas = versao.goals
  const mudar = (m: Metas) => onMudarVersao({ ...versao, goals: m })
  const eventos = [...EVENTOS_DE_SAIDA, ...catalogo.events]
  const dis = somenteLeitura
  const erros = problemas.filter((p) => p.severity === 'error').length

  return (
    <>
      <Cabecalho titulo="A jornada" sub={somenteLeitura ? 'Só leitura. Toque num passo para ver os detalhes.' : 'Clique num passo para editar. Arraste da paleta para acrescentar.'} />
      <div className="px-4 py-4 space-y-5">
        <section className="space-y-2">
          <label className="block"><Rotulo texto="Nome" obrigatorio /><Input size="sm" value={nome} disabled={dis} onChange={(e) => onMudarNome(e.target.value, descricao)} /></label>
          <label className="block"><Rotulo texto="Descrição" /><Textarea size="sm" rows={2} value={descricao} disabled={dis} onChange={(e) => onMudarNome(nome, e.target.value)} /></label>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold text-surface-200">Meta contínua</p>
          <p className="text-[11px] text-surface-500">Bateu a meta, a pessoa sai na hora, de qualquer passo. Ex.: a consulta foi confirmada conversando com o agente.</p>
          {metas.goals.map((g, i) => (
            <div key={g.id} className="rounded-[8px] bg-surface-800 p-2 space-y-1.5">
              <div className="flex gap-1.5">
                <Input size="sm" value={g.label} disabled={dis} onChange={(e) => mudar({ ...metas, goals: metas.goals.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                {!dis && <Button variant="ghost" size="sm" iconOnly aria-label="Tirar meta" onClick={() => mudar({ ...metas, goals: metas.goals.filter((_, j) => j !== i) })}><Trash2 className="w-3.5 h-3.5" /></Button>}
              </div>
              <Select size="sm" value={g.event} disabled={dis} onChange={(e) => mudar({ ...metas, goals: metas.goals.map((x, j) => (j === i ? { ...x, event: e.target.value } : x)) })} aria-label="Evento da meta">
                {catalogo.events.map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
              </Select>
              <div className="flex items-center justify-between gap-2 text-[11px] text-surface-400">
                <span>Só do mesmo assunto (esta consulta)</span>
                <Switch checked={g.sameSubject} disabled={dis} onChange={(v) => mudar({ ...metas, goals: metas.goals.map((x, j) => (j === i ? { ...x, sameSubject: v } : x)) })} aria-label="Só do mesmo assunto" />
              </div>
            </div>
          ))}
          {!dis && <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => mudar({ ...metas, goals: [...metas.goals, { id: `g_${Math.random().toString(36).slice(2, 7)}`, label: 'Nova meta', event: 'appointment_confirmed', sameSubject: true }] })}>Meta</Button>}
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold text-surface-200">Saídas automáticas</p>
          <p className="text-[11px] text-surface-500">Quando acontecer, a pessoa sai sem receber mais nada.</p>
          {metas.exitIf.map((x, i) => (
            <div key={x.id} className="flex gap-1.5">
              <Select size="sm" value={x.event} disabled={dis} onChange={(e) => {
                const ev = eventos.find((v) => v.key === e.target.value)
                mudar({ ...metas, exitIf: metas.exitIf.map((y, j) => (j === i ? { ...y, event: e.target.value, label: ev?.label ?? y.label } : y)) })
              }} aria-label="Evento de saída">
                {eventos.map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
              </Select>
              {!dis && <Button variant="ghost" size="sm" iconOnly aria-label="Tirar saída" onClick={() => mudar({ ...metas, exitIf: metas.exitIf.filter((_, j) => j !== i) })}><Trash2 className="w-3.5 h-3.5" /></Button>}
            </div>
          ))}
          {!dis && <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => mudar({ ...metas, exitIf: [...metas.exitIf, { id: `x_${Math.random().toString(36).slice(2, 7)}`, label: 'Humano assumiu a conversa', event: 'conversation.human_took_over' }] })}>Saída</Button>}
        </section>

        <section className="space-y-2">
          <label className="block">
            <Rotulo texto="Prazo máximo de uma inscrição (dias)" ajuda="Passou disso, a pessoa sai com o motivo 'prazo'." />
            <Input size="sm" type="number" min={1} value={metas.ttlDays} disabled={dis} onChange={(e) => mudar({ ...metas, ttlDays: Number(e.target.value) })} />
          </label>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold text-surface-200">Conferência do desenho</p>
          {problemas.length === 0
            ? <p className="text-xs text-surface-400">Tudo certo para publicar.</p>
            : <><p className="text-xs text-surface-400">{erros ? `${erros} problema(s) impedem publicar.` : 'Só avisos: dá para publicar.'}</p><ListaDeProblemas problemas={problemas} /></>}
        </section>
      </div>
    </>
  )
}
