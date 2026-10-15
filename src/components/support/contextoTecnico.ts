import type { ContextoTecnico } from './supportModel'

/**
 * CONTEXTO TÉCNICO de um chamado SEM conversa (página Suporte e "Falar com o
 * suporte"): o que a equipe Oryon precisaria perguntar e o navegador já sabe.
 * Capturado quando o formulário abre, mostrado a quem reporta antes do envio
 * ("Vai junto: …") e anexado ao chamado. Nada de dado pessoal: tela, endereço
 * SEM parâmetros de busca (podem levar nome ou telefone), navegador, sistema,
 * versão do app, tamanhos, idioma, fuso e hora.
 *
 * Próximo passo (não faz parte desta captura): os últimos erros do console e
 * as chamadas com falha, com o requestId da T-01.
 */
export function capturarContextoTecnico(rota: string, tela: string | null): ContextoTecnico {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  return {
    tela: tela ?? 'não identificada',
    endereco: rota.split('?')[0] || '/',
    navegador: navegador(ua),
    sistema: sistema(ua),
    versaoDoApp: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'prévia',
    resolucao: typeof screen !== 'undefined' ? `${screen.width}×${screen.height}` : '—',
    janela: typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : '—',
    idioma: typeof navigator !== 'undefined' ? navigator.language : '—',
    fusoHorario: Intl.DateTimeFormat().resolvedOptions().timeZone,
    capturadoEm: new Date().toISOString(),
  }
}

function navegador(ua: string): string {
  const achar = (re: RegExp, nome: string) => { const m = ua.match(re); return m ? `${nome} ${m[1].split('.')[0]}` : null }
  return achar(/Edg\/([\d.]+)/, 'Edge') ?? achar(/OPR\/([\d.]+)/, 'Opera') ?? achar(/Chrome\/([\d.]+)/, 'Chrome')
    ?? achar(/Firefox\/([\d.]+)/, 'Firefox') ?? achar(/Version\/([\d.]+).*Safari/, 'Safari') ?? 'Navegador desconhecido'
}

function sistema(ua: string): string {
  if (/Windows NT/.test(ua)) return 'Windows'
  if (/Android/.test(ua)) return 'Android'
  if (/iPhone|iPad/.test(ua)) return 'iOS'
  if (/Mac OS X/.test(ua)) return 'macOS'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Sistema desconhecido'
}

/** Resumo de uma linha para o formulário: "Funis · Chrome 141 · Windows · 1440×900 · 17:28". */
export function resumoDoContexto(c: ContextoTecnico): string {
  const hora = new Date(c.capturadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return [c.tela, c.navegador, c.sistema, c.janela, hora].join(' · ')
}

/** Linhas "rótulo · valor" do contexto (formulário expandido e fila da Oryon). */
export function linhasDoContexto(c: ContextoTecnico): Array<[string, string]> {
  return [
    ['Tela', c.tela], ['Endereço', c.endereco], ['Navegador', c.navegador], ['Sistema', c.sistema],
    ['Versão do app', c.versaoDoApp], ['Janela', c.janela], ['Monitor', c.resolucao], ['Idioma', c.idioma],
    ['Fuso', c.fusoHorario], ['Hora', new Date(c.capturadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })],
  ]
}
