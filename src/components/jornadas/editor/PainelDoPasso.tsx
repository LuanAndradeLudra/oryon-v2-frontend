import type { ReactNode } from 'react'
import { ChevronRight, CircleAlert, CircleCheck, Copy, Plus, Trash2, TriangleAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'
import type { ApoioDoEditor, Catalogo, Entrada, Jornada, Metas, Porta, ProblemaDoDesenho, VersaoDaJornada } from '@/services/jornadas/tipos'
import { passoDoCatalogo, ROTULO_DO_GRUPO } from '@/services/jornadas/catalogo'
import { ID_DA_ENTRADA } from '@/services/jornadas/layout'
import { IconeDoCatalogo, Selo } from '../comum'
import { numero } from '../apoio'
import { CampoDoPassoEditor, EditorDeCondicoes, Rotulo } from './Campos'
import { OPCOES_DE_PORTA } from './resumo'

/**
 * O painel da direita. Mostra o passo escolhido; com a Entrada escolhida, as
 * portas, o filtro e a reentrada; sem nada escolhido, a jornada (visão geral,
 * meta contínua, saídas automáticas, prazo e a conferência do desenho).
 */

interface Props {
  jornada: Jornada
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
  onIrAoPasso: (id: string) => void
  onFechar: () => void
  somenteLeitura: boolean
}

export function PainelDoPasso(props: Props & { className?: string }) {
  const { selecionado } = props
  return (
    <aside className={cn('w-[360px] shrink-0 border-l border-surface-700 bg-surface-900 flex flex-col min-h-0', props.className)} aria-label="Painel do passo">
      {selecionado === ID_DA_ENTRADA ? <PainelDaEntrada {...props} /> : selecionado && props.versao.graph.nodes[selecionado] ? <PainelDeUmPasso {...props} id={selecionado} /> : <PainelDaJornada {...props} />}
    </aside>
  )
}

// ── peças comuns ─────────────────────────────────────────────────────────────

function Cabecalho({ titulo, sub, icone, onFechar }: { titulo: string; sub?: ReactNode; icone?: ReactNode; onFechar?: () => void }) {
  return (
    <div className="shrink-0 flex items-start gap-3 border-b border-surface-700 px-5 py-4">
      {icone}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-surface-50 leading-5">{titulo}</p>
        {sub && <div className="mt-0.5 text-[12px] text-surface-400 leading-relaxed">{sub}</div>}
      </div>
      {onFechar && <Button variant="ghost" size="sm" iconOnly aria-label="Fechar e ver a jornada" title="Fechar" onClick={onFechar}><X className="w-4 h-4" /></Button>}
    </div>
  )
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="px-5 py-4 border-b border-surface-700 last:border-b-0 space-y-3">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500">{titulo}</h3>
        {descricao && <p className="mt-1 text-[12px] text-surface-400 leading-relaxed">{descricao}</p>}
      </div>
      {children}
    </section>
  )
}

function ListaDeProblemas({ problemas, onIrAoPasso }: { problemas: ProblemaDoDesenho[]; onIrAoPasso?: (id: string) => void }) {
  if (!problemas.length) return null
  return (
    <ul className="space-y-1.5">
      {problemas.map((p, i) => {
        const conteudo = (
          <>
            {p.severity === 'error'
              ? <CircleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--color-danger)]" aria-hidden />
              : <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-status-pending" aria-hidden />}
            <span className="flex-1 text-left">{p.message}</span>
            {onIrAoPasso && p.nodeId && <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-surface-500" aria-hidden />}
          </>
        )
        const classe = cn(
          'w-full flex items-start gap-2 rounded-[8px] px-3 py-2 text-[12px] leading-relaxed',
          p.severity === 'error' ? 'bg-[color-mix(in_srgb,var(--color-danger)_10%,var(--color-surface-800))] text-surface-100' : 'bg-surface-800 text-surface-300',
        )
        return (
          <li key={i}>
            {onIrAoPasso && p.nodeId
              ? <button type="button" onClick={() => onIrAoPasso(p.nodeId!)} className={cn(classe, 'cursor-pointer hover:brightness-110 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500')} title="Ir até o passo">{conteudo}</button>
              : <div className={classe}>{conteudo}</div>}
          </li>
        )
      })}
    </ul>
  )
}

const Rodape = ({ children }: { children: ReactNode }) => (
  <div className="shrink-0 flex items-center gap-2 border-t border-surface-700 bg-surface-900 px-5 py-3">{children}</div>
)

// ── um passo ─────────────────────────────────────────────────────────────────

function PainelDeUmPasso({ id, versao, catalogo, apoio, problemas, onMudarVersao, onApagar, onDuplicar, onFechar, somenteLeitura }: Props & { id: string }) {
  const no = versao.graph.nodes[id]
  const passo = passoDoCatalogo(catalogo, no.type)
  const mudarNo = (parcial: Partial<typeof no>) => onMudarVersao({ ...versao, graph: { ...versao.graph, nodes: { ...versao.graph.nodes, [id]: { ...no, ...parcial } } } })
  const mudarParam = (chave: string, valor: unknown) => mudarNo({ params: { ...no.params, [chave]: valor } })
  const campos = (passo?.params ?? []).filter((c) => !c.showIf || no.params[c.showIf.key] === c.showIf.equals)
  const meus = problemas.filter((p) => p.nodeId === id)

  return (
    <>
      <Cabecalho
        titulo={no.label || passo?.label || no.type}
        sub={passo ? (no.label ? `${ROTULO_DO_GRUPO[passo.group]} · ${passo.label}` : ROTULO_DO_GRUPO[passo.group]) : undefined}
        onFechar={onFechar}
        icone={<span className="inline-flex items-center justify-center w-9 h-9 rounded-[9px] bg-surface-800 text-surface-100 shrink-0"><IconeDoCatalogo nome={passo?.icon} className="w-4 h-4" /></span>}
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Secao titulo="O que este passo faz" descricao={passo?.description}>
          {passo && (
            <div className="flex flex-wrap gap-1.5">
              <Selo tom={passo.cost.credits > 0 ? 'violeta' : 'cinza'}>Custo: {passo.cost.label}</Selo>
              {passo.requires.includes('window_24h') && <Selo tom="ambar">Precisa da janela de 24 h</Selo>}
              {passo.requires.includes('connector') && <Selo tom="azul">Usa o sistema da clínica</Selo>}
            </div>
          )}
          <ListaDeProblemas problemas={meus} />
        </Secao>
        <Secao titulo="Configuração">
          <label className="block">
            <Rotulo texto="Nome no canvas" ajuda="Opcional. Um nome curto ajuda a ler o desenho." />
            <Input size="sm" value={no.label ?? ''} placeholder={passo?.label} disabled={somenteLeitura} onChange={(e) => mudarNo({ label: e.target.value || undefined })} />
          </label>
          {campos.map((campo) => (
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
        </Secao>
      </div>
      {!somenteLeitura && (
        <Rodape>
          <Button variant="secondary" size="sm" leftIcon={<Copy className="w-3.5 h-3.5" />} onClick={() => onDuplicar(id)}>Duplicar</Button>
          <Button variant="ghost" size="sm" className="ml-auto text-[var(--color-danger)]" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => onApagar(id)}>Apagar passo</Button>
        </Rodape>
      )}
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
      <div className="flex-1 min-h-0 overflow-y-auto">
        {problemas.some((p) => p.code === 'no_door' || p.code === 'no_start') && (
          <div className="px-5 pt-4"><ListaDeProblemas problemas={problemas.filter((p) => p.code === 'no_door' || p.code === 'no_start')} /></div>
        )}
        <Secao titulo="Portas de entrada" descricao="De onde vêm as pessoas. Uma jornada pode ter mais de uma porta.">
          {entrada.doors.map((porta, i) => (
            <div key={porta.id} className="rounded-[10px] border border-surface-700 bg-surface-800 p-3 space-y-2.5">
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
              Adicionar porta
            </Button>
          )}
        </Secao>

        <Secao titulo="Quem pode entrar" descricao="Filtro aplicado a cada pessoa que passa pela porta. Sem condição, todos entram.">
          <EditorDeCondicoes grupo={entrada.criteria} onChange={(g) => mudar({ ...entrada, criteria: g })} catalogo={catalogo} disabled={dis} />
        </Secao>

        <Secao titulo="Entrar de novo">
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
        </Secao>
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
        <div className="space-y-2.5">
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
          <div>
            <Rotulo texto="Dias da semana" />
            <div className="flex flex-wrap gap-1" role="group" aria-label="Dias da semana">
              {DIAS.map((d) => {
                const ligado = dias.includes(d)
                return (
                  <button key={d} type="button" disabled={disabled} aria-pressed={ligado}
                    onClick={() => set('weekdays', ligado ? dias.filter((x) => x !== d) : [...dias, d])}
                    className={cn('h-7 min-w-9 px-2 rounded-[7px] text-[11.5px] font-semibold transition-colors cursor-pointer', ligado ? 'bg-[var(--color-accent-soft)] text-brand-500' : 'bg-surface-700 text-surface-400 hover:text-surface-200')}>
                    {d}
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-[11.5px] text-surface-500 leading-relaxed">No fuso da unidade. Cada item da lista acha ou cria o contato e entra com a chave do assunto.</p>
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
        <div className="space-y-2.5">
          <label className="block"><Rotulo texto="Quem (segmento)" /><Input size="sm" value={String(p.segment ?? '')} disabled={disabled} onChange={(e) => set('segment', e.target.value)} /></label>
          <label className="block"><Rotulo texto="Quando" /><Input size="sm" value={String(p.schedule ?? '')} disabled={disabled} onChange={(e) => set('schedule', e.target.value)} /></label>
        </div>
      )
    case 'webhook':
      return (
        <div className="space-y-2.5">
          <label className="block"><Rotulo texto="Nome da porta" /><Input size="sm" value={String(p.name ?? '')} disabled={disabled} onChange={(e) => set('name', e.target.value)} /></label>
          <p className="text-[11.5px] text-surface-500 leading-relaxed">O endereço e o segredo aparecem depois de publicar. Envie um exemplo para mapear telefone, identificador e variáveis sem digitar nome de campo.</p>
        </div>
      )
    case 'manual':
      return <p className="text-[11.5px] text-surface-500 leading-relaxed">Inscreva contatos pela tela de Pessoas ou pela API.</p>
  }
}

// ── a jornada ────────────────────────────────────────────────────────────────

const EVENTOS_DE_SAIDA = [
  { key: 'time.subject_passed', label: 'O assunto passou (ex.: a consulta já aconteceu)' },
  { key: 'contact.opted_out', label: 'Pediu para não receber' },
]

function PainelDaJornada({ jornada, versao, catalogo, problemas, nome, descricao, onMudarVersao, onMudarNome, onIrAoPasso, somenteLeitura }: Props) {
  const metas = versao.goals
  const mudar = (m: Metas) => onMudarVersao({ ...versao, goals: m })
  const eventos = [...EVENTOS_DE_SAIDA, ...catalogo.events]
  const dis = somenteLeitura
  const erros = problemas.filter((p) => p.severity === 'error').length
  const creditos = Object.values(versao.graph.nodes).reduce((s, n) => s + (passoDoCatalogo(catalogo, n.type)?.cost.credits ?? 0), 0)
  const versoes = jornada.enrolledByVersion.filter((v) => v.count > 0)

  return (
    <>
      <Cabecalho titulo="Configurações da jornada" sub={dis ? 'Toque num passo para ver os detalhes.' : 'Clique num passo para editá-lo. Arraste passos da paleta para o canvas.'} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Secao titulo="Conferência do desenho">
          {problemas.length === 0
            ? <p className="flex items-center gap-2 text-[12.5px] text-surface-300"><CircleCheck className="w-4 h-4 text-status-active" aria-hidden />Tudo certo para publicar.</p>
            : (
              <>
                <p className="text-[12.5px] text-surface-300">{erros ? `${erros} ${erros === 1 ? 'problema impede' : 'problemas impedem'} a publicação. Clique para ir até o passo.` : 'Só avisos: dá para publicar.'}</p>
                <ListaDeProblemas problemas={problemas} onIrAoPasso={onIrAoPasso} />
              </>
            )}
        </Secao>

        <Secao titulo="Visão geral">
          <dl className="grid grid-cols-2 gap-2">
            {[
              ['Dentro agora', numero(jornada.enrolledNow)],
              ['IA por pessoa', creditos ? `${creditos.toLocaleString('pt-BR')} crédito${creditos > 1 ? 's' : ''}` : 'Sem IA'],
              ['Versão no ar', jornada.publishedVersion ? `v${jornada.publishedVersion}` : 'Nunca publicada'],
              ['Por versão', versoes.length ? versoes.map((v) => `${numero(v.count)} na v${v.version}`).join(' · ') : '—'],
            ].map(([r, v]) => (
              <div key={r} className="rounded-[8px] bg-surface-800 px-3 py-2">
                <dt className="text-[11px] text-surface-500">{r}</dt>
                <dd className="text-[13px] font-semibold text-surface-100 truncate" title={v}>{v}</dd>
              </div>
            ))}
          </dl>
        </Secao>

        <Secao titulo="Identificação">
          <label className="block"><Rotulo texto="Nome" obrigatorio /><Input size="sm" value={nome} disabled={dis} onChange={(e) => onMudarNome(e.target.value, descricao)} /></label>
          <label className="block"><Rotulo texto="Descrição" /><Textarea size="sm" rows={2} value={descricao} disabled={dis} onChange={(e) => onMudarNome(nome, e.target.value)} /></label>
        </Secao>

        <Secao titulo="Meta contínua" descricao="Quando a meta acontece, a pessoa sai na hora, de qualquer passo. Ex.: a consulta foi confirmada conversando com o agente.">
          {metas.goals.map((g, i) => (
            <div key={g.id} className="rounded-[10px] border border-surface-700 bg-surface-800 p-3 space-y-2">
              <div className="flex gap-1.5">
                <Input size="sm" value={g.label} disabled={dis} aria-label="Nome da meta" onChange={(e) => mudar({ ...metas, goals: metas.goals.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                {!dis && <Button variant="ghost" size="sm" iconOnly aria-label="Tirar meta" onClick={() => mudar({ ...metas, goals: metas.goals.filter((_, j) => j !== i) })}><Trash2 className="w-3.5 h-3.5" /></Button>}
              </div>
              <Select size="sm" value={g.event} disabled={dis} onChange={(e) => mudar({ ...metas, goals: metas.goals.map((x, j) => (j === i ? { ...x, event: e.target.value } : x)) })} aria-label="Evento da meta">
                {catalogo.events.map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
              </Select>
              <div className="flex items-center justify-between gap-2 text-[12px] text-surface-400">
                <span>Só do mesmo assunto (esta consulta)</span>
                <Switch checked={g.sameSubject} disabled={dis} onChange={(v) => mudar({ ...metas, goals: metas.goals.map((x, j) => (j === i ? { ...x, sameSubject: v } : x)) })} aria-label="Só do mesmo assunto" />
              </div>
            </div>
          ))}
          {!dis && <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => mudar({ ...metas, goals: [...metas.goals, { id: `g_${Math.random().toString(36).slice(2, 7)}`, label: 'Nova meta', event: 'appointment_confirmed', sameSubject: true }] })}>Adicionar meta</Button>}
        </Secao>

        <Secao titulo="Saídas automáticas" descricao="Quando acontecer, a pessoa sai sem receber mais nada.">
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
          {!dis && <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => mudar({ ...metas, exitIf: [...metas.exitIf, { id: `x_${Math.random().toString(36).slice(2, 7)}`, label: 'Humano assumiu a conversa', event: 'conversation.human_took_over' }] })}>Adicionar saída</Button>}
        </Secao>

        <Secao titulo="Prazo máximo">
          <label className="block">
            <Rotulo texto="Dias que uma pessoa pode ficar na jornada" ajuda="Passou disso, ela sai com o motivo 'prazo'." />
            <Input size="sm" type="number" min={1} value={metas.ttlDays} disabled={dis} onChange={(e) => mudar({ ...metas, ttlDays: Number(e.target.value) })} />
          </label>
        </Secao>
      </div>
    </>
  )
}
