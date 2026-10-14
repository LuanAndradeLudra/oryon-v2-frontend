import { createContext } from 'react'

/** Trilha "Domínio / [Sub-grupo /] Seção" da seção ativa — calculada pelo
 *  SettingsLayout a partir da própria navegação, então todo SectionHeader
 *  mostra o breadcrumb do mock sem cada seção repetir o texto. */
export const SettingsBreadcrumbCtx = createContext<string[] | undefined>(undefined)

/** Faixa do topo de Configurações: o cabeçalho FIXO das páginas-formulário
 *  (título + Salvar) é desenhado aqui, de borda a borda da área de conteúdo,
 *  em vez de dentro da coluna de leitura — dentro dela a faixa parava no
 *  índice "Nesta página" e deixava um vão à direita (PO 13/10). */
export const FaixaDoTopoCtx = createContext<HTMLElement | null>(null)
