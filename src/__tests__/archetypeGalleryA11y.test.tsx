// ─── A5 / SCRUM-1016 — acessibilidade e evidência da árvore ──────────────────
// O portal do Maestri e a extensão do Chrome estão fora para todo o squad, então
// a evidência visual acordada é dump de DOM + árvore de acessibilidade.
//
// Aqui ela é um SNAPSHOT do vitest em vez de um arquivo escrito à mão: entra no
// diff do PR (o revisor lê a árvore sem rodar nada), o CI a defende sozinho, e
// regenerar é `npx vitest run -u`. Um `.txt` gerado por script só prova o que
// era verdade no dia em que alguém rodou.
//
// Escrever arquivo daqui exigiria `node:fs`, e o `tsconfig.app.json` deste
// projeto só carrega os tipos de `vite/client` — os de Node vivem no
// `tsconfig.node.json`, que inclui apenas o `vite.config.ts`. A cópia solta em
// `coord/evidencias/SCRUM-1016/` existe para o squad, que não abre o repo.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArchetypeGallery } from '@/components/agents/archetypes/ArchetypeGallery'

/** Árvore compacta: só o que um leitor de tela anuncia. */
function arvoreDeAcessibilidade(container: HTMLElement): string {
  const linhas = [`heading h2: ${screen.getByRole('heading', { level: 2 }).textContent}`]
  container.querySelectorAll('article').forEach((card, i) => {
    const nome = card.querySelector('.font-display')?.textContent ?? '?'
    const selo = card.querySelector('.rounded-full')?.textContent
    const bolhas = Array.from(card.querySelectorAll('.max-w-\\[78\\%\\]')).map((b) => b.textContent)
    const chips = Array.from(card.querySelectorAll('.text-3xs span')).map((c) => c.textContent?.trim())
    linhas.push(
      `article[${i}] ${nome}${selo ? ` [${selo}]` : ''}`,
      `  cliente: ${bolhas[0]}`,
      `  agente : ${bolhas[1]}`,
      `  chips  : ${chips.join(' · ')}`,
      `  botão  : ${card.querySelector('button')?.textContent?.trim()}`,
    )
  })
  const botoes = screen.getAllByRole('button')
  linhas.push(`rodapé: ${botoes[botoes.length - 1].textContent?.trim()}`)
  return linhas.join('\n')
}

describe('ArchetypeGallery — acessibilidade', () => {
  it('a tela inteira é legível só pelos nomes acessíveis', () => {
    const { container } = render(<ArchetypeGallery onEscolher={() => {}} />)

    // Um h2 por tela, e os 3 cards são `article` — regiões que o leitor enumera.
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Que tipo de atendimento você quer automatizar?',
    )
    expect(container.querySelectorAll('article')).toHaveLength(3)

    // Todo controle tem nome acessível não-vazio (P5 do checklist).
    const botoes = screen.getAllByRole('button')
    expect(botoes).toHaveLength(4)
    for (const botao of botoes) {
      expect((botao.textContent ?? '').trim().length).toBeGreaterThan(0)
    }

    // O véu de cor é decoração: fora da árvore e sem nada clicável dentro.
    const decorativos = container.querySelectorAll('[aria-hidden="true"]')
    expect(decorativos.length).toBeGreaterThan(0)
    for (const veu of decorativos) {
      expect(veu.querySelector('button, a, input')).toBeNull()
    }
  })

  it('a árvore de acessibilidade é a evidência do PR', () => {
    const { container } = render(<ArchetypeGallery onEscolher={() => {}} />)
    expect(arvoreDeAcessibilidade(container)).toMatchInlineSnapshot(`
      "heading h2: Que tipo de atendimento você quer automatizar?
      article[0] Vendas [Mais usado]
        cliente: Tem o vestido midi em M?
        agente : Tem sim! Veste solto — quer que eu separe? Posso aplicar seu cupom de boas-vindas 💚
        chips  : 3 capacidades · 2 regras
        botão  : Usar este arquétipo
      article[1] Suporte
        cliente: A integração parou de sincronizar
        agente : Vamos resolver. Isso costuma ser o token expirado — te mando o passo a passo. Se não resolver em 5 min, abro um chamado.
        chips  : base obrigatória · 3 regras
        botão  : Usar este arquétipo
      article[2] Pós-venda
        cliente: Chegou antes do prazo, obrigada!
        agente : Que ótimo, Carla! De 0 a 10, quanto você recomendaria a gente? Sua resposta ajuda muito 🙏
        chips  : tags automáticas · follow-up
        botão  : Usar este arquétipo
      rodapé: Começar do zero no Studio"
    `)
  })
})
