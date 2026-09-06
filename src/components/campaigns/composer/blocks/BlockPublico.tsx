// ─── BlockPublico ──────────────────────────────────────────────────────────
// Conteúdo do bloco "Público" — mockup `p3-disparos.html` §D2.
//
// Este arquivo NÃO desenha o construtor de segmento e NÃO sabe nada sobre
// condições, grupos ou exclusões. Quem faz isso é o `AudienceBlock` do Crivo
// (`campaigns/audience/AudienceBlock.tsx`, coord/D6-plano.md §1), que ainda
// não existe na base — a pilha dele (#121/#123/#124) está travada no #87 do
// backend.
//
// Por isso a UI de público entra por **slot** (decisão do Maestro,
// 2026-09-06): a página monta o Composer inteiro hoje, e ligar o componente
// do Crivo quando ele existir é uma linha. A alternativa — um stub que finge
// funcionar, ou trazer lógica de segmento para cá — criaria trabalho para
// jogar fora e furaria o corte de responsabilidade do §9 do D2-plano.
//
// O contrato que este slot espera é exatamente o `AudienceBlockProps` já
// publicado pelo Crivo; a página é quem o satisfaz.
import type { ReactNode } from 'react'
import { Users } from 'lucide-react'

interface BlockPublicoProps {
  /** O `<AudienceBlock …/>` do Crivo. Ausente enquanto a pilha D6 não
   *  mesclar — aí o bloco explica o que falta em vez de fingir uma lista. */
  children?: ReactNode
}

export function BlockPublico({ children }: BlockPublicoProps) {
  if (children) return <>{children}</>

  // Estado honesto: a capacidade não existe ainda. Mesma regra da
  // recorrência e do "Enviar teste" (coord/D2-plano.md §6/§8) — não
  // desenhar um controle morto que anuncia algo que o produto não faz.
  return (
    <div className="flex items-start gap-3 px-3 py-3 rounded-2xl border border-surface-700 bg-surface-800">
      <span className="w-8 h-8 rounded-[9px] flex items-center justify-center bg-surface-700 text-surface-300 flex-shrink-0">
        <Users className="w-4 h-4" aria-hidden />
      </span>
      <div>
        <p className="text-[13.2px] font-semibold text-surface-100">
          O construtor de público chega com a D6
        </p>
        <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">
          Assim que o bloco de segmentação entrar, ele aparece aqui — o resto do
          disparo já pode ser montado normalmente.
        </p>
      </div>
    </div>
  )
}

