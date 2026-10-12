import * as pdfjsLib from 'pdfjs-dist'
// `?url` (helper do Vite): empacota o worker como asset estático e devolve
// a URL final — sem isso, pdfjs-dist tenta subir um worker inline e falha
// silenciosamente em produção (paths de build diferentes de dev).
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

const THUMBNAIL_WIDTH_PX = 400

/**
 * Miniatura instantânea da 1ª página de um PDF, renderizada NO NAVEGADOR do
 * operador — antes de qualquer upload — pra a bolha otimista não ficar sem
 * preview enquanto a mensagem está "pendente" (pedido do usuário
 * 2026-09-23). É só um "enquanto isso": quando a miniatura real (gerada no
 * servidor via pdftoppm, fila assíncrona) chega alguns segundos depois, ela
 * substitui esta sem ninguém notar — mesma página, mesmo conteúdo.
 *
 * Falha graciosamente (PDF corrompido, protegido por senha, etc.) devolvendo
 * `null` — a bolha otimista simplesmente fica sem miniatura até a real
 * chegar, exatamente como já funcionava antes desta feature.
 */
export async function renderPdfThumbnail(file: File): Promise<string | null> {
  try {
    const buffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    const page = await pdf.getPage(1)

    const baseViewport = page.getViewport({ scale: 1 })
    const scale = THUMBNAIL_WIDTH_PX / baseViewport.width
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const canvasContext = canvas.getContext('2d')
    if (!canvasContext) return null

    await page.render({ canvasContext, viewport }).promise
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}
