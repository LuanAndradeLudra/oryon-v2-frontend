// ─── Data local (AAAA-MM-DD) ──────────────────────────────────────────────────
// `new Date().toISOString().slice(0, 10)` devolve a data em UTC: das 21h à
// meia-noite no Brasil isso já é "amanhã". Campos <input type="date"> e datas
// de negócio (recebimento, início de vigência) usam a data do relógio local.

const pad = (n: number) => String(n).padStart(2, '0')

export function localIsoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
