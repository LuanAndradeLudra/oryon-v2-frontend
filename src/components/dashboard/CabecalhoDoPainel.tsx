import type { ReactNode } from 'react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { AbaDoPainel } from '@/lib/abaDoPainel'

// Linha de abas do Dashboard: "Agora" (a operação, padrão) e "Relatórios" (o
// período). Cada aba desenha a mesma linha e põe à direita o que é dela — o
// "ao vivo" na Agora, o período no celular em Relatórios.

interface Props {
  aba: AbaDoPainel
  onAba: (a: AbaDoPainel) => void
  direita?: ReactNode
}

export function CabecalhoDoPainel({ aba, onAba, direita }: Props) {
  return (
    <div className="flex items-center gap-2 min-h-7 flex-wrap">
      <SegmentedControl
        label="Visão do Dashboard"
        size="sm"
        value={aba}
        onChange={onAba}
        options={[
          { value: 'agora', label: 'Agora' },
          { value: 'relatorios', label: 'Relatórios' },
        ]}
      />
      {direita && <div className="ml-auto flex items-center gap-2">{direita}</div>}
    </div>
  )
}
