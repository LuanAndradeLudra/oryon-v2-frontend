// Extraído de AgentDetail.tsx (SCRUM-995 / W0.2). Em arquivo próprio (em vez
// de dentro de shared.tsx) porque um arquivo que exporta componentes E uma
// constante dispara `react-refresh/only-export-components` — no monólito
// original nada disso era `export`ado, então a regra nunca disparava; ao
// extrair para múltiplos arquivos, StatusBadge/InlineEdit (componentes)
// precisam ficar isolados de STATUS_CONFIG (valor) para o lint continuar limpo.

export const STATUS_CONFIG: Record<string, { label: string; chip: string }> = {
  active:  { label: 'Ativo',     chip: 'var(--color-status-active)'  },
  draft:   { label: 'Rascunho',  chip: 'var(--color-status-pending)' },
  paused:  { label: 'Pausado',   chip: 'var(--color-status-muted)'   },
}
