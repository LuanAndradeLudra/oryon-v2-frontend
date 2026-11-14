import { createElement, type CSSProperties } from 'react'
import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import type { StatusDaInscricao, StatusDaJornada } from '@/services/jornadas/tipos'
import { jornadasApi, USANDO_DADOS_DE_EXEMPLO } from '@/services/jornadas/jornadasApi'
import { iconeDe, ROTULO_DO_STATUS } from './apoio'

/** ORY-60 — componentes pequenos que as telas de Jornadas dividem (o resto fica em `apoio.ts`). */

/** Ícone vindo do catálogo pelo nome (o catálogo é dado, não código). */
export function IconeDoCatalogo({ nome, className }: { nome: string | undefined; className?: string }) {
  return createElement(iconeDe(nome), { className, 'aria-hidden': true })
}

// ── selos: fundo sólido em tom suave, sem borda colorida ─────────────────────

type Tom = 'verde' | 'azul' | 'ambar' | 'cinza' | 'vermelho' | 'violeta'

const COR_DO_TOM: Record<Tom, string> = {
  verde: 'var(--color-status-active)',
  azul: 'var(--color-status-open)',
  ambar: 'var(--color-status-pending)',
  cinza: 'var(--color-status-muted)',
  vermelho: 'var(--color-danger)',
  violeta: 'var(--color-accent-violet)',
}

export function Selo({ tom, children, className, title }: { tom: Tom; children: React.ReactNode; className?: string; title?: string }) {
  const style = {
    ['--selo' as string]: COR_DO_TOM[tom],
    backgroundColor: 'color-mix(in srgb, var(--selo) 16%, var(--color-surface-800))',
    color: 'color-mix(in srgb, var(--selo) 78%, var(--color-surface-50))',
  } as CSSProperties
  return (
    <span title={title} style={style} className={cn('inline-flex items-center gap-1 h-5 px-2 rounded-[6px] text-[11px] font-semibold whitespace-nowrap', className)}>
      {children}
    </span>
  )
}

const TOM_DO_STATUS: Record<StatusDaJornada, Tom> = { draft: 'cinza', shadow: 'violeta', active: 'verde', paused: 'ambar', archived: 'cinza' }

export function SeloDoStatus({ status }: { status: StatusDaJornada }) {
  return (
    <Selo tom={TOM_DO_STATUS[status]} title={status === 'shadow' ? 'Roda de verdade, mas não envia nada: grava o que teria feito.' : undefined}>
      {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />}
      {ROTULO_DO_STATUS[status]}
    </Selo>
  )
}

const ROTULO_DA_INSCRICAO: Record<StatusDaInscricao, [string, Tom]> = {
  active: ['Andando', 'azul'],
  waiting: ['Esperando', 'ambar'],
  completed: ['Bateu a meta', 'verde'],
  exited: ['Saiu', 'cinza'],
  failed: ['Falhou', 'vermelho'],
  cancelled: ['Tirada', 'cinza'],
}

export function SeloDaInscricao({ status, shadow }: { status: StatusDaInscricao; shadow?: boolean }) {
  const [rotulo, tom] = ROTULO_DA_INSCRICAO[status]
  return (
    <span className="inline-flex items-center gap-1">
      <Selo tom={tom}>{rotulo}</Selo>
      {shadow && <Selo tom="violeta">sombra</Selo>}
    </span>
  )
}

// ── aviso de protótipo ───────────────────────────────────────────────────────

export function AvisoDeExemplo({ onRestaurado }: { onRestaurado?: () => void }) {
  if (!USANDO_DADOS_DE_EXEMPLO) return null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] bg-surface-800 px-4 py-2.5 text-[13px] text-surface-300">
      <FlaskConical className="w-4 h-4 text-surface-400 shrink-0" aria-hidden />
      <span className="flex-1 min-w-[220px]">
        <strong className="text-surface-100 font-semibold">Protótipo com dados de exemplo.</strong> Nada é salvo no servidor e nenhuma mensagem é enviada. O que você muda fica só neste navegador.
      </span>
      {jornadasApi.restaurarExemplos && (
        <Button variant="ghost" size="sm" onClick={async () => { await jornadasApi.restaurarExemplos?.(); onRestaurado?.() }}>
          Restaurar exemplos
        </Button>
      )}
    </div>
  )
}
