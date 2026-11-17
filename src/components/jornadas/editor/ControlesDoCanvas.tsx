import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useReactFlow, useViewport } from '@xyflow/react'
import { ChartNoAxesColumn, ClipboardList, Hand, ImageDown, LayoutGrid, LocateFixed, Map as IconeMapa, Minus, MousePointer2, Plus, Redo2, Search, Settings2, Sparkles, StickyNote, Undo2, X } from 'lucide-react'
import type { FerramentaDoCanvas } from './ferramentaDoCanvas'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'
import type { Catalogo, Jornada, VersaoDaJornada } from '@/services/jornadas/tipos'
import { ResumoDaJornada } from './ResumoDaJornada'

/**
 * ORY-60 — o menu do canvas, vertical e no canto superior esquerdo, como o do
 * HubSpot (pedido do João em 16/11: a barra acima do canvas tinha informação
 * demais). Cartões pequenos e empilhados, cada um com um assunto:
 *  1. adicionar passo (o único botão cheio);
 *  2. zoom: aproximar, a porcentagem (volta a 100%), afastar e enquadrar tudo;
 *  3. desfazer e refazer;
 *  4. organizar, mapa, números por passo e o resumo da jornada (meta, saídas,
 *     prazo, custo e versão, num balão ao lado).
 * O nome de cada botão aparece ao passar o mouse, à direita.
 */

function Botao({ titulo, atalho, onClick, disabled, ativo, alerta, children }: {
  titulo: string
  atalho?: string
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  ativo?: boolean
  /** Um ponto âmbar no canto: algo pede atenção (ex.: jornada sem meta). */
  alerta?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip side="right" content={atalho ? <>{titulo}<span className="ml-1.5 opacity-60">{atalho}</span></> : titulo}>
      <button
        type="button"
        aria-label={titulo}
        aria-pressed={ativo}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'relative inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-surface-300 transition-colors cursor-pointer',
          'hover:bg-[var(--rowhover)] hover:text-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          'disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-surface-300',
          ativo && 'jt-teal hover:text-[var(--jt-teal-sobre)]',
        )}
      >
        {children}
        {alerta && <span aria-hidden className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--jt-ambar-no)] ring-2 ring-[var(--jt-moldura)]" />}
      </button>
    </Tooltip>
  )
}

function Cartao({ rotulo, children, className }: { rotulo: string; children: ReactNode; className?: string }) {
  return (
    <div role="group" aria-label={rotulo}
      className={cn('flex flex-col items-center gap-0.5 rounded-[10px] border border-surface-700 bg-[var(--jt-moldura)] p-1 shadow-[0_4px_14px_rgba(0,0,0,0.14)]', className)}>
      {children}
    </div>
  )
}

export function ControlesDoCanvas({
  somenteLeitura, ferramenta, onFerramenta, podeDesfazer, podeRefazer, onDesfazer, onRefazer, onOrganizar, mapa, onMapa,
  onAdicionar, onNota, onMudarComIa, onExportar, exportando, buscaAberta, onBuscaAberta, passos, onIrAoPasso, tituloDoAdicionar, mostrarNumeros, onMostrarNumeros, jornada, versao, catalogo, onConfig, onSimular, onVersoes,
}: {
  somenteLeitura: boolean
  /** Seta (arrastar no fundo escolhe vários) ou mão (arrastar move a vista). */
  ferramenta: FerramentaDoCanvas
  onFerramenta: (f: FerramentaDoCanvas) => void
  podeDesfazer: boolean
  podeRefazer: boolean
  onDesfazer: () => void
  onRefazer: () => void
  onOrganizar: () => void
  mapa: boolean
  onMapa: () => void
  onAdicionar: (e: MouseEvent<HTMLButtonElement>) => void
  /** Uma nota adesiva nova no meio da vista (P1, 16/11). */
  onNota?: () => void
  /** "Mudar com IA" (P2, 16/11): descreve a mudança, vê o que muda, aplica no rascunho. */
  onMudarComIa?: () => void
  /** Baixar o desenho como PNG (P2, 16/11). */
  onExportar?: () => void
  exportando?: boolean
  /** Buscar um passo pelo nome, número ou tipo (tecla F). */
  buscaAberta?: boolean
  onBuscaAberta?: (aberta: boolean) => void
  passos?: { id: string; numero: number; nome: string; tipo: string }[]
  onIrAoPasso?: (id: string) => void
  tituloDoAdicionar: string
  mostrarNumeros: boolean
  /** Sem versão publicada não há números para mostrar. */
  onMostrarNumeros?: () => void
  jornada: Jornada
  versao: VersaoDaJornada
  catalogo: Catalogo
  onConfig: () => void
  onSimular: () => void
  onVersoes: () => void
}) {
  const rf = useReactFlow()
  const { zoom } = useViewport()
  const [resumo, setResumo] = useState(false)
  const caixaDoResumo = useRef<HTMLDivElement>(null)
  const semMeta = !versao.goals.goals.length && !Object.values(versao.graph.nodes).some((n) => n.type === 'goal')

  // O balão do resumo fecha com Esc ou num clique fora dele.
  useEffect(() => {
    if (!resumo) return
    const fora = (e: PointerEvent) => { if (!caixaDoResumo.current?.contains(e.target as Node)) setResumo(false) }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setResumo(false) } }
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', tecla, true)
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', tecla, true) }
  }, [resumo])

  const fechandoOResumo = (acao: () => void) => () => { setResumo(false); acao() }

  return (
    <div ref={caixaDoResumo} className="absolute left-3 top-3 z-10 flex flex-col gap-2" role="toolbar" aria-label="Menu do desenho" aria-orientation="vertical">
      {/* O botão principal do menu (16/11): o tom suave da marca (teal claro sólido, "+" em teal escuro),
          o mesmo par dos selos de categoria. Distinto dos botões de zoom, sem cor forte. */}
      {!somenteLeitura && (
        <Cartao rotulo="Adicionar">
          <Tooltip side="right" content={tituloDoAdicionar}>
            <button
              type="button"
              aria-label="Adicionar passo"
              onClick={onAdicionar}
              className="jt-teal inline-flex h-8 w-8 items-center justify-center rounded-[8px] transition-[filter,transform] duration-150 hover:brightness-95 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--jt-moldura)]"
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </button>
          </Tooltip>
        </Cartao>
      )}

      {!somenteLeitura && (
        <Cartao rotulo="Ferramenta">
          <Botao titulo="Escolher: arraste no fundo para escolher vários" atalho="V" onClick={() => onFerramenta('selecionar')} ativo={ferramenta === 'selecionar'}><MousePointer2 className="h-4 w-4" /></Botao>
          <Botao titulo="Mover a vista: arraste no fundo (ou use a roda, ou Espaço + arrastar)" atalho="H" onClick={() => onFerramenta('mao')} ativo={ferramenta === 'mao'}><Hand className="h-4 w-4" /></Botao>
        </Cartao>
      )}

      <Cartao rotulo="Zoom">
        <Botao titulo="Aproximar" onClick={() => rf.zoomIn({ duration: 150 })}><Plus className="h-4 w-4" /></Botao>
        <Tooltip side="right" content="Voltar a 100%">
          <button
            type="button"
            aria-label={`Zoom em ${Math.round(zoom * 100)}%. Voltar a 100%`}
            onClick={() => rf.zoomTo(1, { duration: 150 })}
            className="h-6 w-8 rounded-[6px] text-[10px] font-semibold tabular-nums text-surface-400 transition-colors hover:bg-[var(--rowhover)] hover:text-surface-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {Math.round(zoom * 100)}%
          </button>
        </Tooltip>
        <Botao titulo="Afastar" onClick={() => rf.zoomOut({ duration: 150 })}><Minus className="h-4 w-4" /></Botao>
        <Botao titulo="Enquadrar o desenho inteiro" onClick={() => rf.fitView({ padding: 0.12, maxZoom: 1, duration: 250 })}><LocateFixed className="h-4 w-4" /></Botao>
      </Cartao>

      {!somenteLeitura && (
        <Cartao rotulo="Histórico">
          <Botao titulo="Desfazer" atalho="Ctrl+Z" onClick={onDesfazer} disabled={!podeDesfazer}><Undo2 className="h-4 w-4" /></Botao>
          <Botao titulo="Refazer" atalho="Ctrl+Shift+Z" onClick={onRefazer} disabled={!podeRefazer}><Redo2 className="h-4 w-4" /></Botao>
        </Cartao>
      )}

      <div>
        <Cartao rotulo="Desenho">
          {!somenteLeitura && <Botao titulo="Organizar o desenho" onClick={fechandoOResumo(onOrganizar)}><LayoutGrid className="h-4 w-4" /></Botao>}
          {!somenteLeitura && onNota && <Botao titulo="Pôr uma nota no desenho" onClick={fechandoOResumo(onNota)}><StickyNote className="h-4 w-4" /></Botao>}
          {!somenteLeitura && onMudarComIa && <Botao titulo="Mudar com IA: descreva e veja o que muda antes de aplicar" onClick={fechandoOResumo(onMudarComIa)}><Sparkles className="h-4 w-4" /></Botao>}
          {passos && onBuscaAberta && <Botao titulo="Buscar um passo" atalho="F" onClick={() => { setResumo(false); onBuscaAberta(!buscaAberta) }} ativo={buscaAberta}><Search className="h-4 w-4" /></Botao>}
          {onExportar && <Botao titulo={exportando ? 'Gerando a imagem…' : 'Baixar o desenho como imagem (PNG)'} onClick={fechandoOResumo(onExportar)} disabled={exportando}><ImageDown className="h-4 w-4" /></Botao>}
          <Botao titulo={mapa ? 'Esconder o mapa' : 'Mostrar o mapa'} onClick={fechandoOResumo(onMapa)} ativo={mapa}><IconeMapa className="h-4 w-4" /></Botao>
          {onMostrarNumeros && (
            <Botao titulo={mostrarNumeros ? 'Esconder os números' : 'Ver números: pessoas por passo e a fatia de cada caminho'} onClick={fechandoOResumo(onMostrarNumeros)} ativo={mostrarNumeros}>
              <ChartNoAxesColumn className="h-4 w-4" />
            </Botao>
          )}
          <Botao titulo={semMeta ? 'Resumo da jornada: falta a meta' : 'Resumo da jornada'} onClick={() => setResumo((r) => !r)} ativo={resumo} alerta={semMeta && !resumo}>
            <ClipboardList className="h-4 w-4" />
          </Botao>
        </Cartao>

        <AnimatePresence>
          {buscaAberta && passos && onIrAoPasso && onBuscaAberta && (
            <BuscaDePasso passos={passos} onIr={onIrAoPasso} onFechar={() => onBuscaAberta(false)} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {resumo && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              role="dialog"
              aria-label="Resumo da jornada"
              className="absolute left-[calc(100%+8px)] top-0 max-h-[calc(100dvh-96px)] w-[300px] overflow-y-auto rounded-[12px] border border-surface-700 bg-[var(--jt-moldura)] p-2 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
            >
              <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
                <p className="text-[14px] font-semibold text-surface-50">Resumo da jornada</p>
                <button type="button" onClick={() => setResumo(false)} aria-label="Fechar o resumo"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ResumoDaJornada jornada={jornada} versao={versao} catalogo={catalogo}
                onConfig={fechandoOResumo(onConfig)} onSimular={fechandoOResumo(onSimular)} onVersoes={fechandoOResumo(onVersoes)} />
              <div className="mt-1 border-t border-surface-700 pt-1">
                <button type="button" onClick={fechandoOResumo(onConfig)}
                  className="flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-[14px] font-medium text-surface-200 transition-colors hover:bg-[var(--rowhover)] hover:text-surface-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                  <Settings2 className="h-4 w-4" aria-hidden />Configurações da jornada
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Buscar um passo pelo nome, número ou tipo: Enter vai ao primeiro (P2, 16/11, como a HubSpot). */
function BuscaDePasso({ passos, onIr, onFechar }: { passos: { id: string; numero: number; nome: string; tipo: string }[]; onIr: (id: string) => void; onFechar: () => void }) {
  const [termo, setTermo] = useState('')
  const [ativo, setAtivo] = useState(0)
  const sem = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const t = sem(termo.trim())
  const achados = passos
    .filter((p) => !t || sem(p.nome).includes(t) || sem(p.tipo).includes(t) || String(p.numero) === t)
    .sort((a, b) => a.numero - b.numero)
    .slice(0, 8)
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.16, ease: 'easeOut' }}
      role="dialog" aria-label="Buscar um passo"
      className="absolute left-[calc(100%+8px)] top-0 w-[300px] rounded-[12px] border border-surface-700 bg-[var(--jt-moldura)] p-2 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
    >
      <input
        autoFocus
        value={termo}
        onChange={(e) => { setTermo(e.target.value); setAtivo(0) }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.stopPropagation(); onFechar() }
          else if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((a) => Math.min(a + 1, achados.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)) }
          else if (e.key === 'Enter' && achados[ativo]) onIr(achados[ativo].id)
        }}
        placeholder="Nome, número ou tipo do passo"
        aria-label="Buscar um passo"
        className="h-9 w-full rounded-[8px] border border-[var(--jt-borda-campo)] bg-surface-950 px-3 text-[14px] text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <ul className="mt-1.5 max-h-[280px] overflow-y-auto" role="listbox" aria-label="Passos">
        {achados.map((p, i) => (
          <li key={p.id}>
            <button type="button" role="option" aria-selected={i === ativo} onMouseEnter={() => setAtivo(i)} onClick={() => onIr(p.id)}
              className={cn('flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left cursor-pointer', i === ativo ? 'bg-[var(--rowhover)]' : '')}>
              <span className="w-5 shrink-0 text-right text-[12px] tabular-nums text-surface-500">{p.numero || ''}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-surface-100">{p.nome}</span>
                <span className="block truncate text-[12px] text-surface-400">{p.tipo}</span>
              </span>
            </button>
          </li>
        ))}
        {!achados.length && <li className="px-2 py-2 text-[12px] text-surface-400">Nenhum passo com esse nome.</li>}
      </ul>
    </motion.div>
  )
}
