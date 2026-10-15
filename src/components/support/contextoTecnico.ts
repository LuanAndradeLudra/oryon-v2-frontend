import type { ContextoTecnico } from './supportModel'
import type { AtividadeRecente, FalhaDeRede } from '@/lib/atividadeRecente'

/**
 * CONTEXTO TÉCNICO de um chamado SEM conversa (página Suporte e "Falar com o
 * suporte"): o que a equipe Oryon precisaria perguntar e o navegador já sabe.
 * Capturado quando o formulário abre, mostrado a quem reporta antes do envio
 * ("Vai junto: …") e anexado ao chamado. Nada de dado pessoal: tela, endereço
 * SEM parâmetros de busca (podem levar nome ou telefone), navegador, sistema,
 * versão do app, tamanhos, idioma, fuso e hora.
 *
 * Nível 1b (SCRUM-1390): as falhas, os erros e as telas dos últimos 15 min
 * (lib/atividadeRecente) vão junto só se a pessoa deixar ("Incluir no chamado").
 */
export function capturarContextoTecnico(rota: string, tela: string | null): ContextoTecnico {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  return {
    tela: tela ?? 'não identificada',
    endereco: rota.split('?')[0] || '/',
    navegador: navegador(ua),
    sistema: sistema(ua),
    // Identificador do build (release do Sentry ou commit), definido em vite.config.ts.
    versaoDoApp: (import.meta.env.VITE_VERSAO_DO_BUILD as string | undefined) || 'desconhecida',
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

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const falhou = (f: FalhaDeRede) => `${f.tela} não carregou (${f.status ? `erro ${f.status}` : 'sem resposta do servidor'} às ${hora(f.em)})`

/**
 * A sugestão do formulário (SCRUM-1390): a falha mais recente NESTA tela
 * ("Relatórios não carregou (erro 500 às 10:42)") ou, sem ela, a mais recente
 * de outra; e quanto mais há. Null quando não há nada para sugerir.
 */
export function sugestaoDaAtividade(a: AtividadeRecente | null, tela: string): { principal: string; mais: string | null } | null {
  if (!a || (!a.falhas.length && !a.erros.length)) return null
  const daTela = [...a.falhas].reverse().find((f) => f.tela === tela)
  const ultima = daTela ?? a.falhas.at(-1)
  const principal = ultima
    ? `${daTela ? 'nesta tela' : 'em outra tela'}: ${falhou(ultima)}`
    : `um erro na página (${a.erros.at(-1)!.tipo} às ${hora(a.erros.at(-1)!.em)})`
  const outras = a.falhas.length - (ultima ? 1 : 0)
  const partes = [outras > 0 ? `${outras} outra(s) falha(s) de rede` : null, a.erros.length && ultima ? `${a.erros.length} erro(s) na página` : null]
    .filter(Boolean)
  return { principal, mais: partes.length ? `E mais: ${partes.join(' e ')} nos últimos 15 min.` : null }
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
