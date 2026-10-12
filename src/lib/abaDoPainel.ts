/** Abas do Dashboard: "Agora" (a operação, padrão) e "Relatórios" (o período). */
export type AbaDoPainel = 'agora' | 'relatorios'

export function lerAbaDoPainel(v: string | null): AbaDoPainel {
  return v === 'relatorios' ? 'relatorios' : 'agora'
}
