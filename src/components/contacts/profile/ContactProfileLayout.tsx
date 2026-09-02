import type { ReactNode } from 'react'

interface ContactProfileLayoutProps {
  left: ReactNode
  center: ReactNode
  right: ReactNode
}

/**
 * Corpo de 3 regiões do perfil (padrão de app de comunicação —
 * Intercom/Front/Missive/Attio): a página NÃO rola; cada coluna preenche
 * 100% da altura disponível e rola internamente. O centro (timeline) é o
 * herói: laterais têm largura FIXA (sem bump em 2xl — o espaço extra de
 * telas largas vai sempre para o centro, nunca encolhe ao cruzar
 * breakpoint) e o centro cresce com flex-1.
 *
 * Coluna direita: os painéis crescem (flex-1) para dividir a altura quando
 * sobra espaço, mas NUNCA encolhem abaixo do próprio conteúdo (min-h-fit) —
 * sem isso, flex-shrink clipava tarefas/sugestões silenciosamente em
 * 1366×768 e o overflow-y-auto do aside nunca ativava.
 *
 * <1280px (xl): a coluna direita some — o caller reinjeta seus painéis na
 * esquerda (abaixo do acordeão de atributos, que é o trabalho primário).
 */
export function ContactProfileLayout({ left, center, right }: ContactProfileLayoutProps) {
  return (
    <div className="flex-1 min-h-0 flex items-stretch gap-4 px-4 pb-4 pt-1 w-full">
      <aside className="w-[360px] shrink-0 h-full min-h-0 overflow-y-auto scroll-thin pr-1 -mr-1 flex flex-col gap-4">
        {left}
      </aside>
      <main className="flex-1 min-w-0 h-full min-h-0 flex flex-col">
        {center}
      </main>
      <aside className="hidden xl:flex w-[400px] shrink-0 h-full min-h-0 overflow-y-auto scroll-thin pr-1 -mr-1 flex-col gap-4 [&>*]:flex-1 [&>*]:min-h-fit">
        {right}
      </aside>
    </div>
  )
}
