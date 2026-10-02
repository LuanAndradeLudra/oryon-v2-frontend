// ─── Abrir PDF autenticado numa aba nova (SCRUM-1209) ─────────────────────────
// O PDF vem por fetch (cookie de sessão) como blob. Dois cuidados:
// 1) a aba é aberta ANTES do fetch, ainda dentro do clique — `window.open`
//    depois de um `await` é barrado pelo bloqueador de pop-up;
// 2) erro no fetch fecha a aba vazia e sobe uma mensagem legível (a resposta de
//    erro chega como Blob, então lemos o JSON do backend para achar `message`).
// Sem aba (pop-up bloqueado mesmo assim), o PDF é baixado via <a download>.

const FALLBACK = 'Não foi possível abrir o PDF. Tente novamente.'

async function readableError(e: unknown): Promise<Error> {
  const data = (e as { response?: { data?: unknown } })?.response?.data
  if (data instanceof Blob) {
    try {
      const body = JSON.parse(await data.text()) as { message?: string | string[] }
      const msg = Array.isArray(body.message) ? body.message[0] : body.message
      if (msg) return new Error(msg)
    } catch { /* corpo não é JSON */ }
  }
  const msg = (data as { message?: string } | undefined)?.message
  return new Error(typeof msg === 'string' && msg ? msg : FALLBACK)
}

export async function openPdfInNewTab(load: () => Promise<Blob>, filename = 'fatura.pdf'): Promise<void> {
  const win = window.open('', '_blank')
  let blob: Blob
  try {
    blob = await load()
  } catch (e) {
    win?.close()
    throw await readableError(e)
  }
  const url = URL.createObjectURL(blob)
  if (win && !win.closed) {
    win.opener = null
    win.location.href = url
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
