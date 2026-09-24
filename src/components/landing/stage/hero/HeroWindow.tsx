import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { WindowPose } from './heroComposition'

/**
 * Uma JANELA do palco — a peça que faltava na arquitetura anterior.
 *
 * Cada superfície do produto vive dentro de uma destas: moldura própria,
 * `overflow-hidden` próprio, sombra e borda próprias, dimensão própria. É
 * isso que faz Conversas e Funis lerem como dois aplicativos abertos lado a
 * lado, e não como duas metades da mesma tela gigante — o defeito estrutural
 * que motivou esta reescrita.
 *
 * Consequência direta: uma janela pode recuar, sair ou ganhar foco sem levar o
 * conteúdo das outras junto, e nada de uma tela pode "sobrar" na lateral da
 * outra, porque o recorte de cada uma termina na própria borda.
 *
 * A moldura repete o desenho do palco (cantos arredondados no topo, barra de
 * janela com três pontos e o nome da tela), mas aqui ela é FECHADA embaixo:
 * é um objeto inteiro, não um corte.
 */
export function HeroWindow({
  title,
  pose,
  width,
  height,
  duration = 0.9,
  className,
  children,
}: {
  title: string
  pose: WindowPose
  width: number
  height: number
  duration?: number
  className?: string
  children: ReactNode
}) {
  return (
    <motion.div
      className={cn('absolute top-0 left-0 origin-top-left', className)}
      style={{ width, height, zIndex: pose.z }}
      initial={false}
      animate={{
        x: pose.x,
        y: pose.y,
        scale: pose.scale,
        opacity: pose.visible ? pose.opacity : 0,
      }}
      transition={{ duration, ease: [0.32, 0.72, 0, 1] }}
      // `visibility` em vez de desmontar: a janela que sai de cena mantém o
      // estado interno (scroll da conversa, colunas do funil) e volta sem
      // repintar do zero. E nada invisível fica ocupando espaço de leitura.
      aria-hidden
    >
      <div
        className="w-full h-full flex flex-col overflow-hidden rounded-[13px] border border-[var(--frame-stroke)] bg-surface-900 shadow-[var(--frame-shadow)]"
        /* Sem `visibility` amarrado à pose: escondê-lo no instante em que a
           janela fica invisível cortava o próprio fade pela metade. Quem tira
           a janela de cena é a opacidade animada; o `pointer-events` já está
           desligado no palco inteiro. */
      >
        <div
          className="h-[30px] flex-shrink-0 flex items-center gap-1.5 px-3"
          style={{ background: 'var(--frame-chrome)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-surface-600" />
          <span className="w-1.5 h-1.5 rounded-full bg-surface-600" />
          <span className="w-1.5 h-1.5 rounded-full bg-surface-600" />
          <span className="text-[10.5px] font-semibold text-surface-400 ml-1.5 truncate">{title}</span>
        </div>
        <div className="relative flex-1 min-h-0 flex overflow-hidden">
          {children}
        </div>
      </div>
    </motion.div>
  )
}
