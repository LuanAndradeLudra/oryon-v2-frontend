import { createContext } from 'react'

/** Trilha "Domínio / [Sub-grupo /] Seção" da seção ativa — calculada pelo
 *  SettingsLayout a partir da própria navegação, então todo SectionHeader
 *  mostra o breadcrumb do mock sem cada seção repetir o texto. */
export const SettingsBreadcrumbCtx = createContext<string[] | undefined>(undefined)
