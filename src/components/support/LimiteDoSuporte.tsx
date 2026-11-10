import { Component, type ReactNode } from 'react'
import { showToast } from '@/hooks/useToast'

/**
 * Limite de erro do formulário do suporte (revisão do Portão 2): se o pedaço
 * do formulário não carrega (arquivo antigo depois de uma atualização, rede
 * fora) ou quebra ao montar, avisa e fecha — sem derrubar a tela inteira.
 * O `lazyRoute` já recarrega a página uma vez quando o arquivo sumiu.
 */
export class LimiteDoSuporte extends Component<{ children: ReactNode; aoFalhar: () => void }, { falhou: boolean }> {
  state = { falhou: false }

  static getDerivedStateFromError() {
    return { falhou: true }
  }

  componentDidCatch() {
    showToast('Não foi possível abrir o formulário do suporte. Recarregue a página e tente de novo.', 'error')
    this.props.aoFalhar()
  }

  render() {
    return this.state.falhou ? null : this.props.children
  }
}
