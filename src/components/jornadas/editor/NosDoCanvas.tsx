import { memo, useContext, useState, useEffect, useRef } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { CircleAlert, Funnel, MessageSquare, Plus, Repeat2, Sparkles, StickyNote, UsersRound, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconeDoPasso } from './IconeDoPasso'
import { ContextoDoCanvas } from './contextoDoCanvas'
import { corDaSaida } from './categorias'
import type { SaidaDoPasso } from '@/services/jornadas/catalogo'
import type { GrupoDoPasso } from '@/services/jornadas/tipos'

/**
 * Os cartões do canvas, no formato compacto dos builders de mercado (Zapier,
 * monday, Customer.io): ícone na cor da categoria, "número · nome" e uma linha de
 * resumo com o valor configurado em destaque. Os nomes dos caminhos não ficam
 * mais no rodapé do cartão: vão como pílulas sobre as ligações (HubSpot, Zapier,
 * Bird). Os números ("agora" e "em 30 dias") só aparecem com "Ver números".
 */

export interface DadosDoPasso extends Record<string, unknown> {
  numero: number
  /** O tipo do passo no catálogo (o ícone vem da galeria por ele). */
  tipo: string
  titulo: string
  resumo: string
  icone: string
  grupo: GrupoDoPasso
  saidas: SaidaDoPasso[]
  /** Saídas ainda sem destino: ganham o nome e um "+" embaixo do cartão. */
  saidasLivres: string[]
  erros: number
  custo: string | null
  contador: { now: number; reached: number } | null
  mostrarNumeros: boolean
  noCaminhoDoTeste: boolean
  atualNoTeste: boolean
  emBreve: boolean
  /** Com "Ver mudanças": o passo é novo ou mudou desde a versão no ar. */
  mudanca: 'novo' | 'mudou' | null
  /** Comentários abertos neste passo (P1, 16/11). */
  comentarios: number
  /** Outra pessoa editando este passo agora (presença, P2 16/11). */
  presenca: string | null
}

/** Uma nota adesiva no canvas (P1, 16/11, como o Customer.io). */
export interface DadosDaNota extends Record<string, unknown> {
  texto: string
  cor: 'amarelo' | 'azul' | 'verde'
  autor?: string
  somenteLeitura: boolean
  onMudar: (texto: string) => void
  onApagar: () => void
}
export type NoDaNotaRF = Node<DadosDaNota, 'nota'>
const COR_DA_NOTA: Record<DadosDaNota['cor'], string> = { amarelo: 'jt-ambar', azul: 'jt-azul', verde: 'jt-verde' }

export const NoDaNota = memo(function NoDaNota({ data, selected }: NodeProps<NoDaNotaRF>) {
  const [editando, setEditando] = useState(!data.texto && !data.somenteLeitura)
  const [rascunho, setRascunho] = useState(data.texto)
  const campo = useRef<HTMLTextAreaElement>(null)
  // O React Flow deixa o cartão novo invisível até medir: o foco vem logo depois (e tenta de novo).
  useEffect(() => {
    if (!editando) return
    const focar = () => { if (document.activeElement !== campo.current) campo.current?.focus() }
    const t1 = setTimeout(focar, 60)
    const t2 = setTimeout(focar, 250)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [editando])
  const terminar = () => { setEditando(false); if (rascunho !== data.texto) data.onMudar(rascunho) }
  return (
    <div
      className={cn('jornadas-surgir w-[232px] rounded-[10px] px-3 py-2.5 shadow-[0_6px_18px_rgba(0,0,0,0.18)]', COR_DA_NOTA[data.cor], selected && 'ring-2 ring-brand-500')}
      onDoubleClick={() => { if (!data.somenteLeitura) { setRascunho(data.texto); setEditando(true) } }}
    >
      <div className="flex items-center gap-1.5 text-[12px] font-semibold opacity-80">
        <StickyNote className="h-3.5 w-3.5" aria-hidden />Nota{data.autor ? ` · ${data.autor}` : ''}
        {!data.somenteLeitura && (
          <button type="button" aria-label="Apagar a nota" title="Apagar a nota" onClick={(e) => { e.stopPropagation(); data.onApagar() }}
            className="nodrag ml-auto inline-flex h-5 w-5 items-center justify-center rounded-[5px] hover:bg-black/10 cursor-pointer">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {editando ? (
        <textarea
          ref={campo}
          rows={4}
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onBlur={terminar}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); terminar() } }}
          placeholder="Escreva a nota…"
          aria-label="Texto da nota"
          className="nodrag nopan nowheel mt-1 w-full resize-none bg-transparent text-[14px] leading-snug placeholder:opacity-60 focus:outline-none"
        />
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-[14px] leading-snug">{data.texto || 'Nota vazia: clique duas vezes para escrever.'}</p>
      )}
    </div>
  )
})

export interface DadosDaEntrada extends Record<string, unknown> {
  portas: { titulo: string; detalhe: string }[]
  filtro: string
  reentrada: string
  /** A Entrada ainda não leva a nenhum passo. */
  semInicio: boolean
  erros: number
  noCaminhoDoTeste: boolean
}

export type NoDoPassoRF = Node<DadosDoPasso, 'passo'>
export type NoDaEntradaRF = Node<DadosDaEntrada, 'entrada'>

/**
 * Largura: fixa para quem tem uma saída; quem ramifica alarga um pouco, para as
 * saídas ainda livres (com nome e "+") caberem lado a lado embaixo do cartão,
 * sem encostar no tronco central dos caminhos já ligados.
 */
export const LARGURA_DO_PASSO = 252
const VAGAS = (n: number) => (n % 2 === 0 ? n : n + 1)
const larguraDoPasso = (saidas: number) => (saidas > 1 ? Math.max(LARGURA_DO_PASSO, VAGAS(saidas) * 104) : LARGURA_DO_PASSO)
export const LARGURA_DA_ENTRADA = 284

/**
 * Onde fica a alça de cada saída, de 0 a 100% da largura. Saída ligada de quem
 * ramifica sai pelo tronco do meio; as livres ficam em vagas fixas dos lados
 * (com número par de vagas, o meio é sempre divisa, nunca vaga).
 */
function posicoesDasSaidas(chaves: string[], livres: string[]): number[] {
  const n = chaves.length
  if (n <= 1) return [50]
  const algumaLigada = chaves.some((k) => !livres.includes(k))
  if (!algumaLigada) return chaves.map((_, i) => 12 + (76 * i) / (n - 1))
  const vagas = VAGAS(n)
  const meio = (n - 1) / 2
  return chaves.map((k, i) => {
    if (!livres.includes(k)) return 50
    const vaga = n % 2 === 1 && i >= meio ? i + 1 : i
    return ((vaga + 0.5) / vagas) * 100
  })
}

/** O "+" de uma saída livre: abre o seletor e liga o passo novo ali. Com várias saídas, leva o nome do caminho. */
function SaidaLivre({ origem, saida, rotulo, cor, esquerda }: { origem: string; saida: string; rotulo?: string; cor?: string; esquerda: number }) {
  const { abrirSeletor, somenteLeitura, insercao } = useContext(ContextoDoCanvas)
  // Com a lista de passos aberta (painéis encaixados): o passo novo vai entrar nesta saída.
  const aqui = insercao?.tipo === 'saida' && insercao.origem === origem && insercao.saida === saida
  return (
    <div className={cn('nodrag nopan absolute top-full flex -translate-x-1/2 flex-col items-center gap-2 pt-3', aqui && 'z-10')} style={{ left: `${esquerda}%` }}>
      {rotulo && <PilulaDeCaminho rotulo={rotulo} cor={cor} estreita />}
      {!somenteLeitura && (
        <button
          type="button"
          title="Adicionar o próximo passo"
          aria-label={rotulo ? `Adicionar o próximo passo em "${rotulo}"` : 'Adicionar o próximo passo'}
          onClick={(e) => { e.stopPropagation(); abrirSeletor({ tipo: 'saida', origem, saida }, { x: e.clientX, y: e.clientY }) }}
          className={cn(
            'jornadas-surgir inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-surface-500 bg-[var(--jt-moldura)] text-surface-400 cursor-pointer transition-[scale,color,border-color] duration-150 hover:scale-110 hover:border-brand-500 hover:border-solid hover:text-brand-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            aqui && 'border-solid border-brand-500 bg-brand-500 text-[var(--color-btn-primary-fg)] hover:text-[var(--color-btn-primary-fg)] jornadas-pulso-marca',
          )}
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
        </button>
      )}
      {aqui && (
        <div aria-hidden className="jornadas-surgir flex h-[58px] w-[220px] items-center justify-center rounded-[12px] border-2 border-dashed border-brand-500 bg-[color-mix(in_srgb,var(--color-brand-500)_8%,transparent)] text-[13px] font-semibold text-brand-500">
          O passo novo entra aqui
        </div>
      )}
    </div>
  )
}

/** O nome de um caminho, como pílula (no fim da ligação ou embaixo da saída livre). */
export function PilulaDeCaminho({ rotulo, cor, extra, estreita }: { rotulo: string; cor?: string; extra?: string; estreita?: boolean }) {
  return (
    <span className={cn('inline-flex items-center', estreita ? 'max-w-[96px]' : 'max-w-[168px]')} data-pilula>
    <span className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-surface-600 bg-[var(--jt-moldura)] px-2 h-6 text-[12px] font-medium text-surface-200 shadow-[0_1px_2px_rgba(0,0,0,0.12)]" title={rotulo}>
      {cor && <span className="w-2 h-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden />}
      <span className="truncate">{rotulo}</span>
      {extra && <span className="shrink-0 tabular-nums text-surface-400">{extra}</span>}
    </span>
    </span>
  )
}

const ALCA = '!w-2.5 !h-2.5 !border-2 !border-[var(--jt-canvas)] !bg-surface-400'
const MOLDURA = 'jornadas-surgir relative rounded-[12px] border border-[var(--jt-borda-passo,var(--color-surface-700))] bg-surface-800 shadow-[0_1px_2px_rgba(0,0,0,0.14)] transition-[box-shadow,border-color] duration-200 hover:border-surface-500 hover:shadow-[0_6px_18px_rgba(0,0,0,0.16)]'

/** O resumo com o valor em destaque: o que vem antes do primeiro " · " é o valor; o resto, o detalhe. */
function Resumo({ texto }: { texto: string }) {
  if (!texto) return <span className="text-surface-500">Falta configurar</span>
  const i = texto.indexOf(' · ')
  if (i < 0) return <span className="text-surface-200">{texto}</span>
  return <><span className="text-surface-200">{texto.slice(0, i)}</span><span className="text-surface-400">{texto.slice(i)}</span></>
}

export const NoDoPasso = memo(function NoDoPasso({ id, data, selected }: NodeProps<NoDoPassoRF>) {
  const { verQuemEsta } = useContext(ContextoDoCanvas)
  const abrirQuemEsta = verQuemEsta ? (e: React.MouseEvent) => { e.stopPropagation(); verQuemEsta(id) } : undefined
  const n = data.saidas.length
  const varias = n > 1
  const posicoes = posicoesDasSaidas(data.saidas.map((s) => s.key), data.saidasLivres)
  return (
    <div
      style={{ width: larguraDoPasso(n) }}
      className={cn(
        MOLDURA,
        selected && 'ring-2 ring-brand-500 border-transparent',
        !selected && data.atualNoTeste && 'ring-2 ring-[var(--color-accent-violet)] jornadas-pulso',
        !selected && !data.atualNoTeste && data.noCaminhoDoTeste && 'ring-1 ring-[var(--jt-violeta-sobre)]',
        data.emBreve && 'border-dashed',
        !selected && data.mudanca === 'novo' && 'ring-2 ring-[var(--jt-verde-no)] border-transparent',
        !selected && data.mudanca === 'mudou' && 'ring-2 ring-[var(--jt-ambar-no)] border-transparent',
      )}
    >
      {data.presenca && (
        <span className="absolute -top-2.5 left-3 inline-flex h-[22px] items-center gap-1 rounded-full border-2 border-[var(--jt-canvas)] bg-[var(--jt-violeta-no)] px-1.5 text-[11px] font-bold text-white" title={`${data.presenca} está editando este passo`}>
          {data.presenca.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
        </span>
      )}
      {data.mudanca && (
        <span className={cn('absolute -top-2.5 left-12 inline-flex h-[22px] items-center rounded-full border-2 border-[var(--jt-canvas)] px-2 text-[12px] font-semibold', data.mudanca === 'novo' ? 'jt-verde' : 'jt-ambar')}>
          {data.mudanca === 'novo' ? 'Novo' : 'Mudou'}
        </span>
      )}
      <Handle type="target" position={Position.Top} className={ALCA} />
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <IconeDoPasso tipo={data.tipo} grupo={data.grupo} />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-1.5 text-[14px] font-semibold leading-5 text-surface-50" title={data.titulo}>
            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-surface-500">{data.numero}</span>
            <span className="truncate">{data.titulo}</span>
            {data.comentarios > 0 && <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium text-surface-400" title={`${data.comentarios} comentário(s) aberto(s)`}><MessageSquare className="h-3 w-3" aria-hidden />{data.comentarios}</span>}
          </p>
          {data.mostrarNumeros && data.contador ? (
            // "Ver números" troca o resumo pelos números, sem mudar a altura do cartão (o desenho não pula).
            <p className="mt-0.5 flex items-center gap-3 text-[12px] leading-[1.4] text-surface-400 tabular-nums">
              {abrirQuemEsta && data.contador.now > 0 ? (
                <button type="button" onClick={abrirQuemEsta} className="nodrag rounded-[4px] hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" title="Ver quem está neste passo agora"><strong className="font-semibold text-surface-50">{data.contador.now.toLocaleString('pt-BR')}</strong> agora</button>
              ) : <span title="Pessoas neste passo agora"><strong className="font-semibold text-surface-50">{data.contador.now.toLocaleString('pt-BR')}</strong> agora</span>}
              <span title="Pessoas que passaram por aqui nos últimos 30 dias"><strong className="font-semibold text-surface-200">{data.contador.reached.toLocaleString('pt-BR')}</strong> em 30 dias</span>
            </p>
          ) : (
            <p className="mt-0.5 truncate text-[12px] leading-[1.4]" title={data.resumo}><Resumo texto={data.resumo} /></p>
          )}
          {(data.custo || data.emBreve) && (
            <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-surface-400">
              <Sparkles className="w-3 h-3" aria-hidden />{data.emBreve ? 'Próximo épico' : data.custo}
            </p>
          )}
        </div>
      </div>
      {data.erros > 0 ? (
        <span className="absolute -top-2.5 right-3 inline-flex items-center gap-0.5 rounded-full border-2 border-[var(--jt-canvas)] px-1.5 h-[22px] text-[12px] font-semibold jt-vermelho" title={`${data.erros} problema(s) neste passo`}>
          <CircleAlert className="w-3 h-3" aria-hidden />{data.erros}
        </span>
      ) : data.contador && data.contador.now > 0 && !data.mostrarNumeros ? (
        <button type="button" onClick={abrirQuemEsta} disabled={!abrirQuemEsta}
          className="nodrag absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full border-2 border-[var(--jt-canvas)] px-1.5 h-[22px] text-[12px] font-medium tabular-nums jt-cinza enabled:cursor-pointer enabled:hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          title={`${data.contador.now.toLocaleString('pt-BR')} pessoa(s) neste passo agora. Clique para ver quem.`} aria-label={`Ver as ${data.contador.now.toLocaleString('pt-BR')} pessoas neste passo agora`}>
          <UsersRound className="w-3 h-3" aria-hidden />{data.contador.now.toLocaleString('pt-BR')}
        </button>
      ) : null}
      {data.saidas.map((s, i) => {
        // No tronco comum as alças se sobrepõem: arrastar dali religaria um caminho às cegas.
        const noTronco = varias && !data.saidasLivres.includes(s.key)
        return <Handle key={s.key} type="source" id={s.key} position={Position.Bottom} className={ALCA} isConnectableStart={!noTronco} style={{ left: `${posicoes[i]}%` }} />
      })}
      {data.saidas.map((s, i) => data.saidasLivres.includes(s.key) && (
        <SaidaLivre key={s.key} origem={id} saida={s.key} esquerda={posicoes[i]} rotulo={varias ? s.label : undefined} cor={varias ? corDaSaida(s.key, i) : undefined} />
      ))}
    </div>
  )
})

export const NoDaEntrada = memo(function NoDaEntrada({ data, selected }: NodeProps<NoDaEntradaRF>) {
  return (
    <div
      style={{ width: LARGURA_DA_ENTRADA }}
      className={cn(MOLDURA, selected && 'ring-2 ring-brand-500 border-transparent', !selected && data.noCaminhoDoTeste && 'ring-1 ring-[var(--jt-violeta-sobre)]')}
    >
      <div className="flex items-start gap-2.5 px-3 pt-2.5">
        <IconeDoPasso tipo="entrada" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-5 text-surface-50">Entrada</p>
          {data.portas.length === 0 && <p className="text-[12px] text-surface-500">Escolha como as pessoas entram</p>}
          {data.portas.map((p, i) => (
            <p key={i} className="mt-0.5 truncate text-[12px] leading-[1.4]" title={`${p.titulo} · ${p.detalhe}`}>
              <span className="text-surface-200">{p.titulo}</span><span className="text-surface-400"> · {p.detalhe}</span>
            </p>
          ))}
        </div>
        {data.erros > 0 && <CircleAlert className="w-4 h-4 shrink-0 text-[var(--color-danger)]" aria-label="A entrada tem problema" />}
      </div>
      <dl className="px-3 pt-2 pb-2.5 space-y-1 text-[12px] text-surface-400">
        <div className="flex items-start gap-2" title="Quem pode entrar">
          <Funnel className="w-3.5 h-3.5 mt-0.5 shrink-0 text-surface-500" aria-hidden />
          <dd className="line-clamp-1">{data.filtro}</dd>
        </div>
        <div className="flex items-start gap-2" title="Entrar de novo">
          <Repeat2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-surface-500" aria-hidden />
          <dd className="line-clamp-1">{data.reentrada}</dd>
        </div>
      </dl>
      <Handle type="source" id="next" position={Position.Bottom} className="!w-2.5 !h-2.5 !border-2 !border-[var(--jt-canvas)] !bg-brand-500" />
      {data.semInicio && <SaidaLivre origem="__entrada" saida="next" esquerda={50} />}
    </div>
  )
})
