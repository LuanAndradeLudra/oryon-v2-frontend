import { useContext } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useStore, type EdgeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { ContextoDoCanvas } from './contextoDoCanvas'
import { PilulaDeCaminho } from './NosDoCanvas'
import { cn } from '@/lib/utils'

/** O que a ligação sabe além das pontas: se é um caminho de quem ramifica, o nome dele e, com "Ver números", a fatia. */
export interface DadosDaLigacao extends Record<string, unknown> {
  /** Sai de um passo que ramifica: desce pelo tronco comum e se separa logo abaixo do cartão. */
  ramo?: boolean
  rotulo?: string
  cor?: string
  extra?: string
  /** Mesmo caminho de outra saída do passo (mesmo destino): não repete o "+". */
  repetida?: boolean
  /** Os destinos de todos os caminhos de quem ramifica: o barramento fica no meio até o mais alto deles. */
  irmaos?: string[]
}

/** Sem os irmãos medidos: o barramento fica a esta distância da base do cartão. */
const BARRAMENTO = 18
/** Metade da altura da pílula do caminho (ela fica centrada sobre o barramento). */
const MEIA_PILULA = 12

/**
 * A ligação entre dois passos. Quem ramifica tem um tronco só, no meio da base
 * do cartão; logo abaixo os caminhos se separam num barramento horizontal e cada
 * um desce com o próprio nome numa pílula (como HubSpot e Zapier). O "+"
 * discreto insere um passo ENTRE os dois, já ligado.
 */
export function LigacaoComMais({ id, source, target, sourceHandleId, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data }: EdgeProps) {
  const { abrirSeletor, somenteLeitura, insercao } = useContext(ContextoDoCanvas)
  const d = (data ?? {}) as DadosDaLigacao
  // Com a lista de passos aberta (painéis encaixados): esta é a ligação onde o passo novo vai entrar.
  const aqui = insercao?.tipo === 'entre' && insercao.origem === source && insercao.saida === (sourceHandleId ?? 'next') && insercao.destino === target
  const desce = targetY > sourceY + 64
  const emBarramento = !!d.ramo && desce
  // O topo do cartão mais alto entre os destinos dos caminhos (acompanha o arrasto). Como no n8n, o
  // barramento fica no MEIO entre a base de quem ramifica e esse topo: tronco e descidas do mesmo
  // tamanho, em vez de a linha colar no cartão de cima (16/11).
  const topoDosRamos = useStore((s) => {
    let menor = Infinity
    for (const alvo of d.irmaos ?? []) {
      const y = s.nodeLookup.get(alvo)?.internals.positionAbsolute.y
      if (y !== undefined && y > sourceY + 32 && y < menor) menor = y
    }
    return menor
  })
  const meio = emBarramento
    ? (Number.isFinite(topoDosRamos) ? (sourceY + Math.min(topoDosRamos, targetY)) / 2 : sourceY + BARRAMENTO)
    : 0
  const [caminho, x, y] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 12, offset: 18,
    ...(emBarramento ? { centerY: meio } : {}),
  })
  // No barramento: a pílula fica sobre a linha, onde o caminho desce; o "+" no meio do que sobra da descida.
  const posMais = emBarramento
    ? { x: targetX, y: ((d.rotulo ? meio + MEIA_PILULA : meio) + targetY) / 2 }
    : { x, y }
  return (
    <>
      <BaseEdge id={id} path={caminho} style={aqui ? { ...style, stroke: 'var(--color-brand-500)', strokeWidth: 2.5 } : style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        {d.rotulo && (
          <div
            className="nodrag nopan absolute pointer-events-none"
            style={{ transform: emBarramento ? `translate(-50%, -50%) translate(${targetX}px, ${meio}px)` : `translate(-50%, -100%) translate(${targetX}px, ${targetY - 10}px)` }}
          >
            <PilulaDeCaminho rotulo={d.rotulo} cor={d.cor} extra={d.extra} />
          </div>
        )}
        {!somenteLeitura && !d.repetida && (
          // A posição fica na caixa de fora e o crescer no hover, no botão. Juntos no mesmo
          // elemento, o `scale` do hover multiplicava também o deslocamento até o meio da
          // ligação: o botão fugia do mouse e ficava piscando (16/11).
          <div
            className={cn('nodrag nopan absolute pointer-events-none', aqui && 'z-10')}
            style={{ transform: `translate(-50%, -50%) translate(${posMais.x}px, ${posMais.y}px)` }}
          >
            <button
              type="button"
              title="Inserir um passo aqui"
              aria-label="Inserir um passo nesta ligação"
              onClick={(e) => { e.stopPropagation(); abrirSeletor({ tipo: 'entre', origem: source, saida: sourceHandleId ?? 'next', destino: target }, { x: e.clientX, y: e.clientY }) }}
              className={cn(
                'pointer-events-auto flex items-center justify-center w-[18px] h-[18px] rounded-full border border-surface-700 bg-[var(--jt-moldura)] text-surface-500 cursor-pointer transition-[scale,color,border-color] duration-150 hover:scale-125 hover:border-brand-500 hover:text-brand-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                aqui && 'scale-125 border-brand-500 bg-brand-500 text-[var(--color-btn-primary-fg)] hover:text-[var(--color-btn-primary-fg)] jornadas-pulso-marca',
              )}
            >
              <Plus className="w-3 h-3" aria-hidden />
            </button>
            {aqui && (
              <span className="jornadas-surgir absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-brand-500 px-2 py-0.5 text-[12px] font-semibold text-[var(--color-btn-primary-fg)] shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
                Entra aqui
              </span>
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}
