import { useState } from 'react'
import { AlertCircle, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  PERIODOS, MAX_DIAS_PERSONALIZADO, diaMenos, diasDoIntervalo,
  hojeEmBrasilia, rotuloDoPeriodo, validarIntervalo,
  type Comparacao, type Periodo,
} from '@/lib/periodoDoPainel'
import { cn } from '@/lib/utils'

// 28/09: o backend aceita `?range=` nos dois endpoints do Dashboard (A-71).
// Quem não segue o período diz o próprio recorte no cartão (ver lib/periodoDoPainel.ts).
// SCRUM-1216 (05/11): "Últimos 90 dias", "Mês anterior", "Personalizado"
// (De … até …, até 400 dias, no máximo hoje) e a comparação com o ano anterior.

// O app não define `color-scheme`: sem isto, no tema escuro o ícone e o
// calendário nativos do campo de data saem pretos sobre o fundo escuro.
const CAMPO_DE_DATA = '[color-scheme:dark] [[data-theme=light]_&]:[color-scheme:light]'

const COMPARACOES: ReadonlyArray<{ value: Comparacao; label: string }> = [
  { value: 'anterior', label: 'Período anterior' },
  { value: 'ano_anterior', label: 'Mesmo período do ano anterior' },
]

// R2-DASH-03 (mock 1b): o período no slot da TopBar é UMA pílula de seleção
// ("Hoje ⌄": h28, raio 7, borda --bd2, 12/600), não um grupo de botões.
export function DateRangePicker({ value, onChange }: { value: Periodo; onChange: (v: Periodo) => void }) {
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState(false)
  const hoje = hojeEmBrasilia()
  const [de, setDe] = useState(() => (value.tipo === 'personalizado' ? value.de : diaMenos(hoje, 29)))
  const [ate, setAte] = useState(() => (value.tipo === 'personalizado' ? value.ate : hoje))
  const [tentou, setTentou] = useState(false)

  const fechar = () => { setOpen(false); setEditando(false); setTentou(false) }
  const abrir = () => {
    // Reabre com o intervalo à vista (ou os últimos 30 dias) e sem erro antigo.
    if (value.tipo === 'personalizado') { setDe(value.de); setAte(value.ate) }
    setEditando(value.tipo === 'personalizado')
    setTentou(false)
    setOpen(true)
  }

  const erro = validarIntervalo(de, ate)
  const dias = diasDoIntervalo(de, ate)
  const aplicar = () => {
    setTentou(true)
    if (erro) return
    onChange({ tipo: 'personalizado', de, ate, comparar: value.comparar })
    fechar()
  }

  const rotulo = rotuloDoPeriodo(value)
  const comparaAno = value.comparar === 'ano_anterior'

  return (
    <Dropdown
      open={open}
      onClose={fechar}
      align="right"
      className="w-[min(18rem,calc(100vw-2rem))]"
      anchor={
        <button
          type="button"
          onClick={() => (open ? fechar() : abrir())}
          aria-haspopup="menu"
          aria-label={`Período: ${rotulo}${comparaAno ? ', comparado ao ano anterior' : ''}`}
          aria-expanded={open}
          data-testid="periodo-pilula"
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] border border-[var(--bd2)] text-xs font-semibold text-surface-100 hover:bg-[var(--rowhover)] transition-colors max-w-[46vw] sm:max-w-none"
        >
          <span className="truncate">{rotulo}</span>
          {comparaAno && <span className="hidden sm:inline text-surface-400 font-medium">· vs. ano anterior</span>}
          <ChevronDown className="w-3 h-3 text-surface-500 flex-shrink-0" />
        </button>
      }
    >
      <div className="px-1 py-1 flex flex-col gap-0.5">
        {PERIODOS.map((opt) => {
          const ativo = value.tipo === 'fixo' && opt.value === value.valor
          return (
            <DropdownItem
              key={opt.value}
              active={ativo}
              onClick={() => { onChange({ tipo: 'fixo', valor: opt.value, comparar: value.comparar }); fechar() }}
            >
              <span className="flex-1">{opt.label}</span>
              {ativo && <Check className="w-3.5 h-3.5 text-accent-dark" aria-hidden />}
            </DropdownItem>
          )
        })}
        <DropdownItem active={value.tipo === 'personalizado'} onClick={() => setEditando((e) => !e)}>
          <span className="flex-1">Personalizado…</span>
          <ChevronRight className={cn('w-3.5 h-3.5 text-surface-500 transition-transform', editando && 'rotate-90')} aria-hidden />
        </DropdownItem>

        {editando && (
          // As setas do menu (Dropdown) não podem roubar o teclado dos campos de data.
          <div
            className="mx-1 mt-1 mb-1 p-2.5 rounded-[8px] border border-surface-700 flex flex-col gap-2"
            onKeyDown={(e) => { if (e.key !== 'Escape') e.stopPropagation() }}
            data-testid="periodo-personalizado"
          >
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 min-w-0">
                <span className="text-[11.5px] font-medium text-surface-300">De</span>
                <Input
                  type="date"
                  size="sm"
                  className={CAMPO_DE_DATA}
                  value={de}
                  max={ate || hoje}
                  onChange={(e) => setDe(e.target.value)}
                  aria-invalid={tentou && !!erro}
                  data-testid="periodo-de"
                />
              </label>
              <label className="flex flex-col gap-1 min-w-0">
                <span className="text-[11.5px] font-medium text-surface-300">Até</span>
                <Input
                  type="date"
                  size="sm"
                  className={CAMPO_DE_DATA}
                  value={ate}
                  min={de || undefined}
                  max={hoje}
                  onChange={(e) => setAte(e.target.value)}
                  aria-invalid={tentou && !!erro}
                  data-testid="periodo-ate"
                />
              </label>
            </div>
            {tentou && erro ? (
              // Texto neutro + ícone vermelho: o vermelho em 11,5 px não passa de 4,5:1 no tema escuro.
              <p role="alert" className="flex items-start gap-1.5 text-[11.5px] font-medium text-surface-100" data-testid="periodo-erro">
                <AlertCircle className="w-3.5 h-3.5 mt-px flex-shrink-0 text-danger" aria-hidden />
                <span>{erro}</span>
              </p>
            ) : (
              <p className="text-[11.5px] text-surface-400">
                {dias && dias > 0 && !erro ? `${dias === 1 ? '1 dia' : `${dias} dias`} · ` : ''}até {MAX_DIAS_PERSONALIZADO} dias, no máximo até hoje
              </p>
            )}
            <div className="flex justify-end">
              <Button size="sm" onClick={aplicar} data-testid="periodo-aplicar">Aplicar</Button>
            </div>
          </div>
        )}

        <DropdownSeparator />
        <p className="px-2 pt-1 pb-0.5 text-2xs font-semibold uppercase tracking-[0.1em] text-surface-400">Comparar com</p>
        {COMPARACOES.map((c) => {
          const ativo = value.comparar === c.value
          return (
            <DropdownItem
              key={c.value}
              active={ativo}
              onClick={() => { onChange({ ...value, comparar: c.value }); fechar() }}
            >
              <span className="flex-1">{c.label}</span>
              {ativo && <Check className="w-3.5 h-3.5 text-accent-dark" aria-hidden />}
            </DropdownItem>
          )
        })}
      </div>
    </Dropdown>
  )
}

