// Retomadas (06/11): se a pessoa já fechou o passo a passo do plano (só neste navegador; sem
// armazenamento, ele só volta a aparecer).
const CHAVE = 'oryon:planos:como-trabalhar-visto'

export function jaViuOComoTrabalhar(): boolean {
  try { return localStorage.getItem(CHAVE) === '1' } catch { return false }
}

export function marcarComoTrabalharVisto(visto: boolean) {
  try { if (visto) localStorage.setItem(CHAVE, '1'); else localStorage.removeItem(CHAVE) } catch { /* sem armazenamento: só não lembra */ }
}

export const reabrirComoTrabalhar = () => marcarComoTrabalharVisto(false)
