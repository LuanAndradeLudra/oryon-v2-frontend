// ─── ConditionRow ──────────────────────────────────────────────────────────
// Uma linha do construtor: conector (E/OU), campo, operador, valores e a
// contagem parcial — o `.cond` do mockup (`p1b-extra.html`). A linha é lida
// como frase ("Etiqueta contém qualquer carrinho, interesse-alto"), e clicar
// nela abre o editor.
//
// O editor é INLINE (expande abaixo da linha), não popover: são 3 campos de
// um mesmo registro, o que a Carta de Padrões §1 resolve inline, e assim não
// entra mais um overlay ancorado sem `useLayer` (a primitiva de camada ainda
// não existe).
import { useId } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { type Accent } from '@/components/ui/accentColor'
import { accentSurface, accentText } from './audienceTint'
import { fieldSpec, FIELD_CATALOG, operatorLabel, type FieldSpec } from './fieldCatalog'
import type { EditorCondition } from './segmentBuilder'
import type { SegmentField, SegmentOperator } from '@/types/campaignsV2'

export interface ValueOption {
  value: string
  label: string
}

interface ConditionRowProps {
  condition: EditorCondition
  /** Conector mostrado à esquerda: vazio na primeira linha do grupo. */
  connector?: string
  /** Opções de valor já resolvidas pelo `AudienceBlock` (etiquetas e
   *  situações vêm das Configurações da conta, o resto é enum fixo). */
  optionsFor: (spec: FieldSpec) => ValueOption[]
  editing: boolean
  onToggleEdit: () => void
  onChange: (patch: Partial<Omit<EditorCondition, 'id'>>) => void
  onRemove: () => void
  /** Linha que o motor atual não sabe avaliar (fallback sem BE.3): fica
   *  esmaecida e sem contagem, em vez de exibir um número errado. */
  disabled?: boolean
  /** Contagens do grupo "Excluir sempre" aparecem como `−127`. */
  negative?: boolean
  /** No fallback o campo é fixo (1 grupo E sobre o segmento legado). */
  lockedField?: boolean
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

/** Chip de valor — o `.val span` do mockup. Teal por padrão, rosa quando o
 *  valor nega (`.neg`): cor categórica via `--color-accent-*` + `color-mix`,
 *  nunca hex (Carta de Padrões §7). */
function ValueChip({ children, negative }: { children: React.ReactNode; negative?: boolean }) {
  const accent: Accent = negative ? 'rose' : 'brand'
  return (
    <span
      className="rounded-[7px] px-2 py-1 text-[12.5px] border"
      style={{
        backgroundColor: accentSurface(accent, 12),
        borderColor: accentSurface(accent, 30),
        // Texto no tom claro do acento, como o mockup faz — o acento cheio
        // neste tamanho fica abaixo do contraste mínimo. Ver `audienceTint`.
        color: accentText(accent),
      }}
    >
      {children}
    </span>
  )
}

/** Valores da linha — o `.val` do mockup. */
function ValueChips({ condition, options, negative }: { condition: EditorCondition; options: ValueOption[]; negative?: boolean }) {
  const spec = fieldSpec(condition.field)

  if (spec.valueKind === 'boolean') {
    const yes = condition.value === true
    return <ValueChip negative={negative || !yes}>{yes ? 'sim' : 'não'}</ValueChip>
  }

  if (spec.valueKind === 'text') {
    const text = typeof condition.value === 'string' ? condition.value : ''
    return text ? <ValueChip>{text}</ValueChip> : <span className="text-surface-500 text-xs">qualquer</span>
  }

  if (spec.valueKind === 'days') {
    const days = typeof condition.value === 'number' ? condition.value : 0
    return <ValueChip negative={negative}>{days} {days === 1 ? 'dia' : 'dias'}</ValueChip>
  }

  const selected = asArray(condition.value)
  if (selected.length === 0) return <span className="text-surface-500 text-xs">escolher…</span>

  return (
    <>
      {selected.map((v) => (
        <ValueChip key={v} negative={negative}>
          {options.find((o) => o.value === v)?.label ?? v}
        </ValueChip>
      ))}
    </>
  )
}

export function ConditionRow({
  condition, connector, optionsFor, editing, onToggleEdit, onChange, onRemove,
  disabled = false, negative = false, lockedField = false,
}: ConditionRowProps) {
  const spec = fieldSpec(condition.field)
  const options = optionsFor(spec)
  const Icon = spec.icon
  const editorId = useId()

  const label = `${spec.label} ${operatorLabel(condition.field, condition.operator)}`

  function changeField(field: SegmentField) {
    const next = fieldSpec(field)
    // Operador e valor pertencem ao campo antigo — trocar o campo sem
    // reiniciar os dois manda para a API um par que o BE.3 rejeita com 400.
    const emptyValue = next.valueKind === 'multi' ? [] : next.valueKind === 'days' ? 7 : next.valueKind === 'boolean' ? true : ''
    onChange({ field, operator: next.operators[0].value, value: emptyValue })
  }

  function toggleValue(value: string) {
    const selected = asArray(condition.value)
    onChange({ value: selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value] })
  }

  return (
    <div className="mb-2">
      <div className="grid grid-cols-[20px_1fr] gap-2.5 items-center">
        <span className="text-[10px] font-bold text-surface-500 text-center font-mono">{connector}</span>

        <div className={cn('flex gap-1.5 items-center flex-wrap', disabled && 'opacity-40')}>
          <button
            type="button"
            onClick={onToggleEdit}
            disabled={disabled}
            aria-expanded={editing}
            aria-controls={editorId}
            className={cn(
              'inline-flex items-center gap-1.5 bg-surface-900 border rounded-[9px] px-2.5 py-1.5',
              'text-[13.2px] text-surface-100 transition-colors',
              editing ? 'border-brand-500' : 'border-surface-700 hover:border-surface-600',
              disabled && 'cursor-not-allowed',
            )}
          >
            <Icon className="w-[13px] h-[13px] text-surface-500" />
            {spec.label}
            {!disabled && <ChevronDown className={cn('w-3 h-3 text-surface-500 transition-transform', editing && 'rotate-180')} />}
          </button>

          <span className="text-xs text-surface-400 px-0.5">{operatorLabel(condition.field, condition.operator)}</span>

          <span className="inline-flex gap-1 flex-wrap">
            <ValueChips condition={condition} options={options} negative={negative} />
          </span>

          <span className="ml-auto flex items-center gap-2">
            {/* `null` é resposta, não silêncio: a API avaliou e ignorou esta
                condição porque ela está sem valor (Decisão D38). Travessão
                diz isso; um número seria indistinguível de um filtro real
                muito permissivo. `undefined` (ainda não avaliada) não mostra
                nada. */}
            {condition.count !== undefined && !disabled && (
              <span
                className="font-mono text-[11.5px] text-surface-500 tabular-nums"
                title={condition.count === null ? 'Sem valor: esta condição não está filtrando nada' : undefined}
              >
                {condition.count === null
                  ? '—'
                  : `${negative ? '−' : ''}${condition.count.toLocaleString('pt-BR')}`}
              </span>
            )}
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remover condição ${label}`}
              className="text-surface-500 hover:text-surface-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      </div>

      {editing && !disabled && (
        <div id={editorId} className="ml-[30px] mt-2 mb-3 rounded-xl border border-surface-700 bg-surface-900 p-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[11px] text-surface-400">
              Campo
              <Select
                value={condition.field}
                disabled={lockedField}
                onChange={(e) => changeField(e.target.value as SegmentField)}
              >
                {FIELD_CATALOG.map((f) => (
                  <option key={f.field} value={f.field}>{f.label}</option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-1 text-[11px] text-surface-400">
              Condição
              <Select
                value={condition.operator}
                onChange={(e) => onChange({ operator: e.target.value as SegmentOperator })}
              >
                {spec.operators.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </label>
          </div>

          {spec.valueKind === 'multi' && (
            <div className="flex flex-wrap gap-1.5">
              {options.length === 0 && <span className="text-xs text-surface-500">Nada configurado ainda.</span>}
              {options.map((o) => {
                const on = asArray(condition.value).includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleValue(o.value)}
                    className={cn(
                      'rounded-[7px] px-2 py-1 text-[12.5px] border transition-colors',
                      on
                        ? 'border-brand-500/40 bg-brand-500/15 text-brand-300'
                        : 'border-surface-700 text-surface-300 hover:border-surface-600',
                    )}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          )}

          {spec.valueKind === 'boolean' && (
            <div className="flex gap-1.5">
              {[{ v: true, l: 'sim' }, { v: false, l: 'não' }].map(({ v, l }) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={condition.value === v}
                  onClick={() => onChange({ value: v })}
                  className={cn(
                    'rounded-[7px] px-3 py-1 text-[12.5px] border transition-colors',
                    condition.value === v
                      ? 'border-brand-500/40 bg-brand-500/15 text-brand-300'
                      : 'border-surface-700 text-surface-300 hover:border-surface-600',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          {spec.valueKind === 'text' && (
            <Input
              value={typeof condition.value === 'string' ? condition.value : ''}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder="Nome ou telefone"
              aria-label="Texto a procurar"
            />
          )}

          {spec.valueKind === 'days' && (
            <label className="flex items-center gap-2 text-xs text-surface-400">
              <Input
                type="number"
                min={1}
                className="w-24"
                value={typeof condition.value === 'number' ? condition.value : 7}
                onChange={(e) => onChange({ value: Math.max(1, Number(e.target.value) || 1) })}
                aria-label="Quantidade de dias"
              />
              dias
            </label>
          )}
        </div>
      )}
    </div>
  )
}
