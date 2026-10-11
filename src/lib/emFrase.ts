/** Título em caixa de frase (só a 1ª maiúscula), como o menu de Configurações
 *  — SCRUM-1253 (PO, 07/10). Nomes próprios e siglas ficam como estão. */
const PROPRIOS = new Set(['WhatsApp', 'IA', 'CRM', 'Oryon', 'Meta', 'Google', 'Ads', 'Copilot'])
export function emFrase(titulo: string): string {
  return titulo.split(' ').map((p, i) => (i > 0 && !PROPRIOS.has(p) && /^[A-ZÀ-Ú][a-zà-ú]+$/.test(p) ? p.toLowerCase() : p)).join(' ')
}
