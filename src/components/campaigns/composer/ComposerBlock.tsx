// ─── ComposerBlock ─────────────────────────────────────────────────────────
// Casca dos 4 blocos do Composer (Template, Público, Variáveis, Envio) —
// mockup `p3-disparos.html` §D2, CSS `.blk/.bh/.bi/.bt/.bs/.bb` em
// `p1b-extra.html:178-186`. Um bloco por vez fica aberto; os fechados
// mostram só o resumo do que já foi decidido.
//
// Não é primitivo de `ui/`: é local ao Composer, reaproveitado 4x dentro
// dele (coord/D2-plano.md §3).
//
// O que este componente carrega de não-óbvio é COMPORTAMENTO DE ESTADO —
// foco e rolagem — que não aparece em captura de tela nenhuma
// (coord/D2-plano.md §11). Ao abrir, o corpo recebe foco e é trazido para a
// janela; ao fechar, o foco volta para o cabeçalho do próprio bloco, nunca
// para o `<body>`. Sem isso, quem navega por teclado perde a posição a cada
// bloco que fecha.
import { useEffect, useRef, useId, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlockStatus } from './useComposerDraft'

interface ComposerBlockProps {
  title: string
  /** Resumo mostrado com o bloco fechado — o que já foi decidido nele. */
  summary: ReactNode
  status: BlockStatus
  /** Ícone do bloco fechado/pendente. Concluído mostra sempre o check. */
  icon: LucideIcon
  /** Chip à direita do cabeçalho (contagem, categoria, "pendente"). */
  badge?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}

export function ComposerBlock({
  title, summary, status, icon: Icon, badge, open, onToggle, children,
}: ComposerBlockProps) {
  const headerId = useId()
  const bodyId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLButtonElement>(null)
  // `undefined` no primeiro render: o bloco que já nasce aberto não deve
  // roubar o foco de quem acabou de entrar na página — só a AÇÃO de abrir
  // move o foco.
  const wasOpen = useRef<boolean | undefined>(undefined)

  const done = status === 'done'

  useEffect(() => {
    const prev = wasOpen.current
    wasOpen.current = open
    if (prev === undefined || prev === open) return

    if (open) {
      bodyRef.current?.focus()
      // `scrollIntoView` não existe no jsdom; guardado para o teste não
      // quebrar por causa de algo que só o navegador faz.
      bodyRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    } else {
      // Fechar não pode largar o foco no `<body>` — ele volta para o
      // cabeçalho que o usuário acabou de acionar.
      headerRef.current?.focus()
    }
  }, [open])

  return (
    <section
      aria-labelledby={headerId}
      className={cn(
        'rounded-[20px] border bg-surface-800 overflow-hidden transition-colors',
        open ? 'border-brand-500/45' : 'border-surface-700',
      )}
    >
      <button
        ref={headerRef}
        id={headerId}
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
        className="w-full grid grid-cols-[32px_1fr_auto] gap-3.5 items-center px-4.5 py-3.5 text-left cursor-pointer"
      >
        {/* O mockup pinta o quadradinho so' em dois estados: concluido
            (verde de status) e aberto (marca). O bloco pendente usa o fundo
            neutro `.bi` — o acento da categoria vive no chip a' direita, nao
            aqui, senao todo bloco fechado ja' chega colorido. */}
        <span
          className={cn(
            'w-8 h-8 rounded-[9px] flex items-center justify-center',
            done
              ? 'bg-status-active/14 text-status-active'
              : open
                ? 'bg-brand-cta/14 text-brand-cta'
                : 'bg-surface-700 text-surface-300',
          )}
        >
          {done
            ? <Check className="w-3.75 h-3.75" />
            : <Icon className="w-3.75 h-3.75" />}
        </span>

        <span className="min-w-0">
          <span className="block text-[15.4px] font-semibold text-surface-100">{title}</span>
          <span className="block text-[12.5px] text-surface-400 mt-px truncate">{summary}</span>
        </span>

        <span className="flex items-center gap-2.5">
          {badge}
          {open
            ? <ChevronUp className="w-4 h-4 text-surface-500" />
            : <ChevronDown className="w-4 h-4 text-surface-500" />}
        </span>
      </button>

      {/* `hidden` em vez de desmontar: o rascunho de cada bloco sobrevive a
          fechar e reabrir, e o `aria-controls` do cabeçalho continua
          apontando para um elemento que existe.

          Sem `role="region"` aqui: a `<section aria-labelledby>` acima JÁ é
          uma região com esse nome. Marcar o corpo como uma segunda região
          aninhada, com o mesmo rótulo, faria o leitor de tela anunciar o
          bloco duas vezes. O `tabIndex={-1}` é só para o foco programático
          ao abrir — não vira parada de tabulação. */}
      <div
        ref={bodyRef}
        id={bodyId}
        tabIndex={-1}
        hidden={!open}
        className="pt-1 px-4.5 pb-4.5 pl-16 border-t border-surface-800 outline-none"
      >
        {children}
      </div>
    </section>
  )
}
