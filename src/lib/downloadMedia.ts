/**
 * Download robusto de mídia: busca como blob (funciona cross-origin desde
 * que o CORS seja permissivo) e cai pra abrir numa nova guia se o navegador
 * recusar. Extraído de MessageBubble.tsx pra MessageBubble e MediaViewer
 * poderem usar sem um importar do outro (evita import circular — MediaViewer
 * já importa `useMediaViewer` inversamente de dentro de MessageBubble).
 */
export async function downloadMedia(url: string, filename?: string) {
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) throw new Error('fetch failed')
    const blob = await res.blob()
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = filename ?? ''
    a.click()
    URL.revokeObjectURL(objUrl)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
