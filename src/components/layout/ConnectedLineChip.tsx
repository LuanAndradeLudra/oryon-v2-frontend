// Chip de status de linha do header (spec 1b DASH-HEADER-02 / 1d CONV-HDR-05/06):
// ponto 6px #22C55E fixo nos dois temas + texto 11.5px/600 na cor --ok, sem
// fundo nem borda. `children` = texto ("WhatsApp conectado", "Linha X · conectada").
import type { ReactNode } from 'react'

export function ConnectedLineChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-success">
      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
      {children}
    </span>
  )
}
