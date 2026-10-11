import { useEffect } from 'react'

/**
 * Aviso ao sair com alterações não salvas (SCRUM-1253, revisão 11/10).
 *
 * O app usa <BrowserRouter> (não é data router), então não há `useBlocker`.
 * Cobre os dois caminhos comuns:
 *   • fechar/recarregar a aba → confirmação nativa do navegador (beforeunload,
 *     mesmo padrão de SalvamentoDoAgente);
 *   • clicar num link interno (menu lateral, itens de Configurações) → confirma
 *     antes de trocar de tela.
 * Não cobre o "Voltar" do navegador nem `navigate()` disparado por botão.
 */
export function useAvisoAoSair(ativo: boolean, mensagem = 'Há alterações não salvas. Sair sem salvar?') {
  useEffect(() => {
    if (!ativo) return
    const antesDeSair = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Navegadores antigos só mostram o aviso com returnValue preenchido.
      e.returnValue = ''
    }
    const aoClicar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const alvo = e.target instanceof Element ? e.target.closest('a[href]') : null
      if (!(alvo instanceof HTMLAnchorElement)) return
      if (alvo.target === '_blank' || alvo.hasAttribute('download')) return
      let url: URL
      try { url = new URL(alvo.href, window.location.href) } catch { return }
      // Outro site: o beforeunload cuida. Âncora na mesma página: não sai.
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      if (!window.confirm(mensagem)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', antesDeSair)
    // Captura no document: roda antes do onClick do <Link> (que fica na raiz do React).
    document.addEventListener('click', aoClicar, true)
    return () => {
      window.removeEventListener('beforeunload', antesDeSair)
      document.removeEventListener('click', aoClicar, true)
    }
  }, [ativo, mensagem])
}
