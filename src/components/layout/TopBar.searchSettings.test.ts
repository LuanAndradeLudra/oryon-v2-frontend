/**
 * Todo atalho de Configurações da busca global (Ctrl+K) precisa apontar para
 * uma seção que existe. Antes, /settings/team, /whatsapp, /hours e
 * /integrations não existiam e caíam calados na primeira seção.
 *
 * Lê o texto dos dois arquivos-fonte (`?raw` do Vite) em vez de exportar as
 * listas — exportar constantes de arquivos de componente quebra o fast refresh.
 */
import { describe, it, expect } from 'vitest'
import topBar from './TopBar.tsx?raw'
import settingsPage from '../../pages/SettingsPage.tsx?raw'

function secoesValidas(): Set<string> {
  const bloco = settingsPage.match(/const VALID_SECTIONS = \[([\s\S]*?)\]/)
  if (!bloco) throw new Error('VALID_SECTIONS não encontrado em SettingsPage.tsx')
  return new Set([...bloco[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]))
}

describe('busca global · atalhos de Configurações', () => {
  it('cada href /settings/<seção> da busca é uma seção real', () => {
    const validas = secoesValidas()
    const hrefs = [...topBar.matchAll(/type: 'settings'[^\n]*?href: '\/settings\/([a-z-]+)'/g)].map((m) => m[1])
    expect(hrefs.length).toBeGreaterThan(5)
    expect(hrefs.filter((h) => !validas.has(h))).toEqual([])
  })
})
