import type { ReactNode } from 'react'
import { useReactFlow, useViewport } from '@xyflow/react'
import { LayoutGrid, Map as IconeMapa, Maximize2, Redo2, Undo2, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Os controles do canvas, num grupo só e no estilo do app: desfazer/refazer,
 * zoom (com a porcentagem, que volta a 100% num clique), enquadrar tudo,
 * organizar e mostrar o mapa. Ficam no canto, com margem, sem cobrir os passos.
 */

function Botao({ titulo, onClick, disabled, ativo, children, largo }: { titulo: string; onClick: () => void; disabled?: boolean; ativo?: boolean; children: ReactNode; largo?: boolean }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={ativo}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-8 rounded-[7px] text-surface-300 transition-colors cursor-pointer',
        largo ? 'px-2.5 text-[12px] font-semibold' : 'w-8',
        'hover:bg-[var(--rowhover)] hover:text-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        'disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        ativo && 'bg-[var(--color-accent-soft)] text-brand-500 hover:text-brand-500',
      )}
    >
      {children}
    </button>
  )
}

const Divisoria = () => <span className="mx-0.5 h-5 w-px bg-surface-700" aria-hidden />

export function ControlesDoCanvas({ somenteLeitura, podeDesfazer, podeRefazer, onDesfazer, onRefazer, onOrganizar, mapa, onMapa }: {
  somenteLeitura: boolean
  podeDesfazer: boolean
  podeRefazer: boolean
  onDesfazer: () => void
  onRefazer: () => void
  onOrganizar: () => void
  mapa: boolean
  onMapa: () => void
}) {
  const rf = useReactFlow()
  const { zoom } = useViewport()
  return (
    <div className="absolute left-4 bottom-4 z-10 flex items-center gap-0.5 rounded-[10px] border border-surface-700 bg-surface-900 p-1 shadow-[0_6px_20px_rgba(0,0,0,0.28)]" role="toolbar" aria-label="Controles do canvas">
      {!somenteLeitura && (
        <>
          <Botao titulo="Desfazer (Ctrl+Z)" onClick={onDesfazer} disabled={!podeDesfazer}><Undo2 className="w-4 h-4" /></Botao>
          <Botao titulo="Refazer (Ctrl+Shift+Z)" onClick={onRefazer} disabled={!podeRefazer}><Redo2 className="w-4 h-4" /></Botao>
          <Divisoria />
        </>
      )}
      <Botao titulo="Diminuir o zoom" onClick={() => rf.zoomOut({ duration: 150 })}><ZoomOut className="w-4 h-4" /></Botao>
      <button
        type="button"
        title="Voltar a 100%"
        onClick={() => rf.zoomTo(1, { duration: 150 })}
        className="h-8 w-12 rounded-[7px] text-[12px] font-semibold tabular-nums text-surface-300 hover:bg-[var(--rowhover)] hover:text-surface-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {Math.round(zoom * 100)}%
      </button>
      <Botao titulo="Aumentar o zoom" onClick={() => rf.zoomIn({ duration: 150 })}><ZoomIn className="w-4 h-4" /></Botao>
      <Botao titulo="Enquadrar o desenho inteiro" onClick={() => rf.fitView({ padding: 0.12, maxZoom: 1, duration: 250 })}><Maximize2 className="w-4 h-4" /></Botao>
      {!somenteLeitura && (
        <>
          <Divisoria />
          <Botao titulo="Organizar o desenho" onClick={onOrganizar} largo><LayoutGrid className="w-4 h-4" />Organizar</Botao>
        </>
      )}
      <Divisoria />
      <Botao titulo={mapa ? 'Esconder o mapa' : 'Mostrar o mapa'} onClick={onMapa} ativo={mapa}><IconeMapa className="w-4 h-4" /></Botao>
    </div>
  )
}
