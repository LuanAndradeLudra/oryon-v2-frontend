import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import type { ApoioDoEditor, CampoDoPasso, Catalogo, Condicao, GrupoDeCondicoes } from '@/services/jornadas/tipos'
import { variaveisConhecidas } from '@/services/jornadas/validar'
import { OPERADORES, valorEmTexto } from './condicoes'

/**
 * Os campos do painel lateral, gerados pelo catálogo: cada `CampoDoPasso.type`
 * tem um controle. Passo novo no backend = formulário novo na tela, sem código.
 */

interface PropsDoCampo {
  campo: CampoDoPasso
  valor: unknown
  onChange: (v: unknown) => void
  catalogo: Catalogo
  apoio: ApoioDoEditor
  params: Record<string, unknown>
  somenteLeitura?: boolean
}

export function Rotulo({ texto, obrigatorio, ajuda }: { texto: string; obrigatorio?: boolean; ajuda?: string }) {
  return (
    <span className="block mb-1">
      <span className="text-xs font-medium text-surface-300">{texto}{obrigatorio && <span className="text-[var(--color-danger)]"> *</span>}</span>
      {ajuda && <span className="block text-[11px] text-surface-500">{ajuda}</span>}
    </span>
  )
}

export function CampoDoPassoEditor(props: PropsDoCampo) {
  const { campo, valor, onChange, apoio, catalogo, somenteLeitura } = props
  const dis = somenteLeitura
  const opcoes = (lista: { id: string; name: string }[]) => [<option key="" value="">Escolha…</option>, ...lista.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)]

  let controle: React.ReactNode
  switch (campo.type) {
    case 'text':
      controle = <Input size="sm" value={String(valor ?? '')} placeholder={campo.placeholder} disabled={dis} onChange={(e) => onChange(e.target.value)} />
      break
    case 'longtext':
      controle = <TextoComVariaveis valor={String(valor ?? '')} onChange={onChange} placeholder={campo.placeholder} catalogo={catalogo} disabled={dis} />
      break
    case 'number':
      controle = <Input size="sm" type="number" value={valor === undefined || valor === null ? '' : String(valor)} disabled={dis} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      break
    case 'boolean':
      controle = <Switch checked={!!valor} disabled={dis} onChange={onChange} aria-label={campo.label} />
      break
    case 'select':
      controle = (
        <Select size="sm" value={String(valor ?? '')} disabled={dis} onChange={(e) => onChange(e.target.value)}>
          {(campo.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      )
      break
    case 'whatsapp_number':
      controle = <Select size="sm" value={String(valor ?? '')} disabled={dis} onChange={(e) => onChange(e.target.value || null)}>{opcoes(apoio.whatsappNumbers.map((l) => ({ id: l.id, name: `${l.name} (${l.phoneMasked})` })))}</Select>
      break
    case 'template':
      controle = (
        <Select size="sm" value={String(valor ?? '')} disabled={dis} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">Escolha…</option>
          {apoio.templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.category === 'MARKETING' ? 'marketing' : 'utilidade'}{t.status !== 'APPROVED' ? ' · aguardando a Meta' : ''}
            </option>
          ))}
        </Select>
      )
      break
    case 'template_variables':
      controle = <VariaveisDoModelo {...props} />
      break
    case 'tag':
      controle = <Select size="sm" value={String(valor ?? '')} disabled={dis} onChange={(e) => onChange(e.target.value || null)}>{opcoes(apoio.tags)}</Select>
      break
    case 'stage':
      controle = <Select size="sm" value={String(valor ?? '')} disabled={dis} onChange={(e) => onChange(e.target.value || null)}>{opcoes(apoio.stages)}</Select>
      break
    case 'user':
      controle = <Select size="sm" value={String(valor ?? '')} disabled={dis} onChange={(e) => onChange(e.target.value || null)}>{opcoes(apoio.users)}</Select>
      break
    case 'department':
      controle = <Select size="sm" value={String(valor ?? '')} disabled={dis} onChange={(e) => onChange(e.target.value || null)}>{opcoes(apoio.departments)}</Select>
      break
    case 'connector_operation':
      controle = (
        <Select size="sm" value={String(valor ?? '')} disabled={dis} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">Escolha…</option>
          {catalogo.connectorOperations.filter((o) => o.kind === 'action').map((o) => <option key={o.key} value={o.key}>{o.label}{o.writes ? ' (grava no sistema)' : ''}</option>)}
        </Select>
      )
      break
    case 'duration':
      controle = <Duracao valor={valor} onChange={onChange} disabled={dis} />
      break
    case 'time_of_day':
      controle = <Input size="sm" type="time" value={String(valor ?? '09:00')} disabled={dis} onChange={(e) => onChange(e.target.value)} />
      break
    case 'events':
      controle = <RespostasEsperadas valor={valor} onChange={onChange} catalogo={catalogo} disabled={dis} />
      break
    case 'conditions':
      controle = <RamosPorCondicao valor={valor} onChange={onChange} catalogo={catalogo} disabled={dis} />
      break
    case 'list':
      controle = <ListaDeItens valor={valor} onChange={onChange} disabled={dis} placeholder={campo.key === 'categories' ? 'Ex.: Quer confirmar' : 'Ex.: contato.id'} />
      break
    default:
      controle = <p className="text-xs text-surface-500">Campo "{campo.type}" sem controle.</p>
  }

  return (
    <label className="block" onClick={(e) => { if (campo.type === 'boolean') e.preventDefault() }}>
      <Rotulo texto={campo.label} obrigatorio={campo.required} ajuda={campo.help} />
      {controle}
    </label>
  )
}

// ── controles compostos ──────────────────────────────────────────────────────

function Duracao({ valor, onChange, disabled }: { valor: unknown; onChange: (v: unknown) => void; disabled?: boolean }) {
  const d = (valor as { amount?: number; unit?: string } | undefined) ?? { amount: 1, unit: 'hours' }
  return (
    <div className="flex gap-2">
      <Input size="sm" type="number" min={1} className="w-24" value={d.amount ?? ''} disabled={disabled} onChange={(e) => onChange({ ...d, amount: e.target.value === '' ? 0 : Number(e.target.value) })} />
      <Select size="sm" value={d.unit ?? 'hours'} disabled={disabled} onChange={(e) => onChange({ ...d, unit: e.target.value })}>
        <option value="minutes">minutos</option>
        <option value="hours">horas</option>
        <option value="days">dias</option>
      </Select>
    </div>
  )
}

function TextoComVariaveis({ valor, onChange, placeholder, catalogo, disabled }: { valor: string; onChange: (v: unknown) => void; placeholder?: string; catalogo: Catalogo; disabled?: boolean }) {
  const variaveis = [...variaveisConhecidas(catalogo)].filter((v) => !v.includes('*')).sort()
  return (
    <div className="space-y-1.5">
      <Textarea size="sm" rows={3} value={valor} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      {!disabled && (
        <Select size="sm" value="" aria-label="Inserir variável" onChange={(e) => { if (e.target.value) onChange(`${valor}${valor && !valor.endsWith(' ') ? ' ' : ''}{{${e.target.value}}}`) }}>
          <option value="">+ Inserir variável…</option>
          {variaveis.map((v) => <option key={v} value={v}>{`{{${v}}}`}</option>)}
        </Select>
      )}
    </div>
  )
}

function VariaveisDoModelo({ valor, onChange, apoio, params, somenteLeitura }: PropsDoCampo) {
  const modelo = apoio.templates.find((t) => t.id === params.templateId)
  if (!modelo) return <p className="text-xs text-surface-500">Escolha o modelo para preencher as variáveis.</p>
  const lista = Array.isArray(valor) ? (valor as string[]) : []
  const editar = (i: number, v: string) => {
    const nova = [...lista]
    while (nova.length < modelo.variableCount) nova.push('')
    nova[i] = v
    onChange(nova)
  }
  return (
    <div className="space-y-2">
      <div className="rounded-[8px] bg-surface-900 px-3 py-2 text-xs text-surface-300 leading-relaxed">
        {modelo.body}
        {modelo.buttons.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {modelo.buttons.map((b) => <span key={b} className="rounded-[6px] bg-surface-700 px-2 py-0.5 text-[11px] text-surface-100">{b}</span>)}
          </span>
        )}
      </div>
      {Array.from({ length: modelo.variableCount }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-[11px] font-mono text-surface-400">{`{{${i + 1}}}`}</span>
          <Input size="sm" value={lista[i] ?? ''} disabled={somenteLeitura} placeholder='{{contato.nome|"paciente"}}' onChange={(e) => editar(i, e.target.value)} />
        </div>
      ))}
    </div>
  )
}

const slug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || `r_${Math.random().toString(36).slice(2, 6)}`

function RespostasEsperadas({ valor, onChange, catalogo, disabled }: { valor: unknown; onChange: (v: unknown) => void; catalogo: Catalogo; disabled?: boolean }) {
  const lista = (Array.isArray(valor) ? valor : []) as { key: string; label: string; event: string; match?: string }[]
  const mudar = (i: number, parcial: Partial<(typeof lista)[number]>) => onChange(lista.map((x, j) => (j === i ? { ...x, ...parcial } : x)))
  return (
    <div className="space-y-2">
      {lista.map((r, i) => (
        <div key={r.key} className="rounded-[8px] bg-surface-900 p-2 space-y-1.5">
          <div className="flex gap-1.5">
            <Input size="sm" value={r.label} placeholder="Nome do ramo" disabled={disabled} onChange={(e) => mudar(i, { label: e.target.value })} />
            {!disabled && <Button variant="ghost" size="sm" iconOnly aria-label="Tirar resposta" onClick={() => onChange(lista.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button>}
          </div>
          <Select size="sm" value={r.event} disabled={disabled} onChange={(e) => mudar(i, { event: e.target.value })}>
            {catalogo.events.map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
          </Select>
          {r.event === 'template.button_replied' && (
            <Input size="sm" value={r.match ?? ''} placeholder="Texto do botão (ex.: Confirmar)" disabled={disabled} onChange={(e) => mudar(i, { match: e.target.value })} />
          )}
        </div>
      ))}
      {!disabled && (
        <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => onChange([...lista, { key: slug(`resposta ${lista.length + 1}`), label: `Resposta ${lista.length + 1}`, event: 'template.button_replied', match: '' }])}>
          Resposta esperada
        </Button>
      )}
      <p className="text-[11px] text-surface-500">Depois do prazo, segue pelo ramo "Sem resposta".</p>
    </div>
  )
}

function RamosPorCondicao({ valor, onChange, catalogo, disabled }: { valor: unknown; onChange: (v: unknown) => void; catalogo: Catalogo; disabled?: boolean }) {
  const lista = (Array.isArray(valor) ? valor : []) as { key: string; label: string; group: GrupoDeCondicoes }[]
  const mudar = (i: number, parcial: Partial<(typeof lista)[number]>) => onChange(lista.map((x, j) => (j === i ? { ...x, ...parcial } : x)))
  return (
    <div className="space-y-2">
      {lista.map((r, i) => (
        <div key={r.key} className="rounded-[8px] bg-surface-900 p-2 space-y-1.5">
          <div className="flex gap-1.5">
            <Input size="sm" value={r.label} placeholder="Nome do ramo" disabled={disabled} onChange={(e) => mudar(i, { label: e.target.value })} />
            {!disabled && <Button variant="ghost" size="sm" iconOnly aria-label="Tirar ramo" onClick={() => onChange(lista.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button>}
          </div>
          <EditorDeCondicoes grupo={r.group} onChange={(g) => mudar(i, { group: g })} catalogo={catalogo} disabled={disabled} />
        </div>
      ))}
      {!disabled && (
        <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => onChange([...lista, { key: slug(`ramo ${lista.length + 1}`), label: `Ramo ${lista.length + 1}`, group: { mode: 'all', conditions: [{ field: catalogo.conditionFields[0].key, op: 'eq', value: '' }] } }])}>
          Ramo
        </Button>
      )}
      <p className="text-[11px] text-surface-500">O que não cair em nenhum ramo segue pelo "Senão".</p>
    </div>
  )
}

function ListaDeItens({ valor, onChange, disabled, placeholder }: { valor: unknown; onChange: (v: unknown) => void; disabled?: boolean; placeholder?: string }) {
  const lista = (Array.isArray(valor) ? valor : []).map((x) => (typeof x === 'string' ? { key: slug(x), label: x } : (x as { key: string; label: string })))
  return (
    <div className="space-y-1.5">
      {lista.map((it, i) => (
        <div key={`${it.key}-${i}`} className="flex gap-1.5">
          <Input size="sm" value={it.label} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(lista.map((x, j) => (j === i ? { key: x.key || slug(e.target.value), label: e.target.value } : x)))} />
          {!disabled && <Button variant="ghost" size="sm" iconOnly aria-label="Tirar item" onClick={() => onChange(lista.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button>}
        </div>
      ))}
      {!disabled && <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => onChange([...lista, { key: slug(`item ${lista.length + 1}`), label: '' }])}>Adicionar</Button>}
    </div>
  )
}

// ── condições (E/OU, sem código) ─────────────────────────────────────────────

export function EditorDeCondicoes({ grupo, onChange, catalogo, disabled }: { grupo: GrupoDeCondicoes; onChange: (g: GrupoDeCondicoes) => void; catalogo: Catalogo; disabled?: boolean }) {
  const mudar = (i: number, parcial: Partial<Condicao>) => onChange({ ...grupo, conditions: grupo.conditions.map((c, j) => (j === i ? { ...c, ...parcial } : c)) })
  return (
    <div className="space-y-1.5">
      {grupo.conditions.length > 1 && (
        <Select size="sm" value={grupo.mode} disabled={disabled} onChange={(e) => onChange({ ...grupo, mode: e.target.value as GrupoDeCondicoes['mode'] })} aria-label="Como juntar as condições">
          <option value="all">Todas as condições (E)</option>
          <option value="any">Qualquer condição (OU)</option>
        </Select>
      )}
      {grupo.conditions.map((c, i) => {
        const campo = catalogo.conditionFields.find((f) => f.key === c.field)
        const op = OPERADORES.find((o) => o.value === c.op)
        return (
          <div key={i} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-1.5 items-start">
            <Select size="sm" value={c.field} disabled={disabled} onChange={(e) => mudar(i, { field: e.target.value })} aria-label="Campo">
              {catalogo.conditionFields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </Select>
            <div className="flex gap-1.5">
              <Select size="sm" value={c.op} disabled={disabled} onChange={(e) => mudar(i, { op: e.target.value as Condicao['op'] })} aria-label="Comparação">
                {OPERADORES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
              {!disabled && <Button variant="ghost" size="sm" iconOnly aria-label="Tirar condição" onClick={() => onChange({ ...grupo, conditions: grupo.conditions.filter((_, j) => j !== i) })}><Trash2 className="w-3.5 h-3.5" /></Button>}
            </div>
            {!op?.semValor && (
              campo?.type === 'boolean' ? (
                <Select size="sm" className="col-span-2" value={c.value === true ? 'true' : c.value === false ? 'false' : ''} disabled={disabled} onChange={(e) => mudar(i, { value: e.target.value === 'true' })} aria-label="Valor">
                  <option value="">Escolha…</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </Select>
              ) : (
                <Input size="sm" className="col-span-2" value={valorEmTexto(c.value)} disabled={disabled} placeholder={c.op === 'in' ? 'Separe por vírgula' : 'Valor'}
                  onChange={(e) => mudar(i, { value: c.op === 'in' ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : campo?.type === 'number' ? Number(e.target.value) : e.target.value })} />
              )
            )}
          </div>
        )
      })}
      {!disabled && (
        <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => onChange({ ...grupo, conditions: [...grupo.conditions, { field: catalogo.conditionFields[0].key, op: 'eq', value: '' }] })}>
          Condição
        </Button>
      )}
    </div>
  )
}
