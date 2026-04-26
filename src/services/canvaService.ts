import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import PptxGenJS from 'pptxgenjs'
import type { ArtifactType } from '@/contexts/ArtifactContext'
import { logger } from '@/services/debugLogger'
import type { SlidesJSON, SlideElement, GradientBg, TextEl, RectEl, CircleEl, LineEl, IconEl } from '@/types/slidesJson'

// ─── Config ────────────────────────────────────────────────────────────────────

const CLIENT_ID    = import.meta.env.VITE_CANVA_CLIENT_ID as string
const REDIRECT_URI = `${window.location.origin}/canva/callback`
const AUTH_URL     = 'https://www.canva.com/api/oauth/authorize'
// Token exchange goes through our Vite proxy to avoid CORS (api.canva.com blocks browser requests)
const TOKEN_URL    = '/api/canva-token'
const IMPORT_URL   = 'https://api.canva.com/rest/v1/imports'
const SCOPE        = 'design:content:read design:content:write'

const LS_ACCESS_TOKEN  = 'canva_access_token'
const LS_REFRESH_TOKEN = 'canva_refresh_token'
const LS_EXPIRES_AT    = 'canva_token_expires_at'
const SS_VERIFIER      = 'canva_pkce_verifier'
const SS_STATE         = 'canva_oauth_state'

// ─── PKCE helpers ──────────────────────────────────────────────────────────────

function randomString(n: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(n)))
    .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, n)
}

async function pkce() {
  const verifier  = randomString(64)
  const digest    = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return { verifier, challenge }
}

// ─── Token helpers ─────────────────────────────────────────────────────────────

export function isCanvaConnected() {
  return !!localStorage.getItem(LS_ACCESS_TOKEN)
}

export function disconnectCanva() {
  localStorage.removeItem(LS_ACCESS_TOKEN)
  localStorage.removeItem(LS_REFRESH_TOKEN)
  localStorage.removeItem(LS_EXPIRES_AT)
}

async function refreshToken(): Promise<string> {
  const refresh = localStorage.getItem(LS_REFRESH_TOKEN)
  if (!refresh) throw new Error('Sem token de refresh. Reconecte o Canva.')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refresh,
    }),
  })
  if (!res.ok) {
    disconnectCanva()
    throw new Error('Sessão Canva expirada. Reconecte.')
  }
  const data = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number }
  storeTokens(data)
  return data.access_token
}

function storeTokens(data: { access_token: string; refresh_token?: string; expires_in?: number }) {
  localStorage.setItem(LS_ACCESS_TOKEN, data.access_token)
  if (data.refresh_token) localStorage.setItem(LS_REFRESH_TOKEN, data.refresh_token)
  localStorage.setItem(LS_EXPIRES_AT, String(Date.now() + (data.expires_in ?? 3600) * 1000))
}

async function getValidToken(): Promise<string> {
  const expiresAt = Number(localStorage.getItem(LS_EXPIRES_AT) ?? 0)
  if (Date.now() < expiresAt - 60_000) {
    return localStorage.getItem(LS_ACCESS_TOKEN)!
  }
  return refreshToken()
}

// ─── OAuth popup flow ──────────────────────────────────────────────────────────

export async function authorizeCanva(): Promise<void> {
  const { verifier, challenge } = await pkce()
  const state = randomString(32)

  sessionStorage.setItem(SS_VERIFIER, verifier)
  sessionStorage.setItem(SS_STATE, state)

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    redirect_uri:          REDIRECT_URI,
    response_type:         'code',
    scope:                 SCOPE,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    state,
  })

  const authUrl = `${AUTH_URL}?${params}`

  logger.log('oauth', 'Iniciando fluxo OAuth Canva', { redirect_uri: REDIRECT_URI, client_id: CLIENT_ID })

  return new Promise((resolve, reject) => {
    const popup = window.open(authUrl, 'canva-oauth', 'width=620,height=720,left=200,top=80')
    if (!popup) { reject(new Error('Popup bloqueado. Permita popups e tente novamente.')); return }
    logger.log('oauth', 'Popup aberto — aguardando autorização do usuário')

    const handler = async (e: MessageEvent) => {
      if (e.data?.type !== 'canva_oauth_code') return
      window.removeEventListener('message', handler)
      clearInterval(poll)
      logger.log('oauth', 'postMessage recebido do popup', { code: String(e.data.code).slice(0, 12) + '…', state: e.data.state })

      const savedState = sessionStorage.getItem(SS_STATE)
      if (e.data.state !== savedState) {
        logger.log('error', 'OAuth state mismatch', { received: e.data.state, expected: savedState })
        reject(new Error('State OAuth inválido.'))
        return
      }

      try {
        const verifier = sessionStorage.getItem(SS_VERIFIER)
        if (!verifier) throw new Error('Verifier não encontrado.')
        logger.log('oauth', `Trocando code por token via ${TOKEN_URL}`)

        // Token exchange via local Vite proxy (/api/canva-token).
        // The proxy adds Authorization: Basic client_id:client_secret server-side
        // so the secret is never exposed to the browser.
        const res = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type:    'authorization_code',
            code:          e.data.code as string,
            redirect_uri:  REDIRECT_URI,
            code_verifier: verifier,
          }),
        })
        logger.log('oauth', `Resposta token: HTTP ${res.status}`)
        if (!res.ok) {
          const errBody = await res.text().catch(() => '')
          logger.log('error', `Token exchange falhou: ${res.status}`, { body: errBody })
          let errMsg = 'Falha na autorização do Canva.'
          try { errMsg = (JSON.parse(errBody) as { error_description?: string }).error_description ?? errMsg } catch { /* ignore */ }
          throw new Error(errMsg)
        }
        const data = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number }
        storeTokens(data)
        sessionStorage.removeItem(SS_VERIFIER)
        sessionStorage.removeItem(SS_STATE)
        logger.log('oauth', '✓ Token Canva armazenado com sucesso')
        resolve()
      } catch (err) {
        logger.log('error', `OAuth falhou: ${String(err)}`)
        reject(err)
      }
    }

    window.addEventListener('message', handler)

    // Detect if user closes popup without completing auth
    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll)
        window.removeEventListener('message', handler)
        logger.log('oauth', 'Popup fechado pelo usuário antes de completar')
        reject(new Error('Autorização cancelada.'))
      }
    }, 500)
  })
}

// ─── HTML → PPTX / PDF capture ────────────────────────────────────────────────
// Slides → PPTX with layered approach:
//   Layer 1: full-slide JPEG (preserves visual design)
//   Layer 2: transparent native text boxes extracted from DOM (editable in Canva)
// Webpage / spreadsheet → PDF (full-page capture).

const PPTX_W_IN  = 13.33   // LAYOUT_WIDE width in inches
const PPTX_H_IN  = 7.5     // LAYOUT_WIDE height in inches
const SLIDE_W_PX = 1280
const SLIDE_H_PX = 720

function unwrapTags(raw: string): string {
  for (const tag of ['webpage', 'spreadsheet', 'slides'] as const) {
    const open = `<${tag}>`, close = `</${tag}>`
    const idx = raw.indexOf(open)
    if (idx !== -1) {
      const end = raw.indexOf(close, idx + open.length)
      return end !== -1 ? raw.slice(idx + open.length, end).trim() : raw.slice(idx + open.length).trim()
    }
  }
  return raw
}

function pxToInX(px: number) { return (px / SLIDE_W_PX) * PPTX_W_IN }
function pxToInY(px: number) { return (px / SLIDE_H_PX) * PPTX_H_IN }

function cssToHex(cssColor: string): string {
  const m = cssColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!m) return 'FFFFFF'
  return [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('').toUpperCase()
}

interface PptxTextBox {
  text: string; x: number; y: number; w: number; h: number
  fontSize: number; color: string; bold: boolean; italic: boolean
  align: 'left' | 'center' | 'right'
}

// Extract editable text boxes from a rendered slide element.
// Uses getBoundingClientRect + getComputedStyle from the iframe's window.
function extractTextBoxes(slideEl: HTMLElement, iframeWin: Window): PptxTextBox[] {
  const slideRect = slideEl.getBoundingClientRect()
  const boxes: PptxTextBox[] = []
  const SELECTORS = 'h1,h2,h3,h4,h5,h6,p,li,button,a,span,td,th,label'

  for (const el of Array.from(slideEl.querySelectorAll(SELECTORS))) {
    // Only process leaf text nodes — skip elements whose text is all in children
    const directText = Array.from(el.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent?.trim() ?? '')
      .join(' ')
      .trim()
    if (!directText) continue

    const rect = el.getBoundingClientRect()
    if (rect.width < 4 || rect.height < 4) continue
    if (rect.bottom < slideRect.top || rect.top > slideRect.bottom + 10) continue
    if (rect.right < slideRect.left || rect.left > slideRect.right + 10) continue

    const st     = iframeWin.getComputedStyle(el)
    const fsPt   = Math.max(Math.round((parseFloat(st.fontSize) || 16) * 0.75), 6)
    const color  = cssToHex(st.color)
    const bold   = parseInt(st.fontWeight) >= 600
    const italic = st.fontStyle === 'italic'
    const align  = (st.textAlign === 'center' ? 'center' : st.textAlign === 'right' ? 'right' : 'left') as 'left' | 'center' | 'right'

    boxes.push({
      text:     directText,
      x:        Math.max(pxToInX(rect.left - slideRect.left), 0),
      y:        Math.max(pxToInY(rect.top  - slideRect.top),  0),
      w:        Math.max(pxToInX(rect.width), 0.3),
      h:        Math.max(pxToInY(rect.height), 0.15),
      fontSize: fsPt, color, bold, italic, align,
    })
  }

  return boxes
}

// Mount a hidden 1280×720 iframe, wait for load + font settle.
async function mountIframe(html: string): Promise<{ doc: Document; win: Window; cleanup: () => void }> {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-2000px;top:0;width:1280px;height:720px;border:0;'
  document.body.appendChild(iframe)

  const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  iframe.src = blobUrl

  await new Promise<void>((res, rej) => {
    iframe.onload  = () => res()
    iframe.onerror = () => rej(new Error('Falha ao carregar o artefato.'))
    setTimeout(() => rej(new Error('Timeout ao carregar o artefato.')), 12_000)
  })
  await new Promise(r => setTimeout(r, 800)) // fonts + CSS animations

  return {
    doc:     iframe.contentDocument!,
    win:     iframe.contentWindow!,
    cleanup: () => { document.body.removeChild(iframe); URL.revokeObjectURL(blobUrl) },
  }
}

// ── Public: capture slides as editable PPTX ────────────────────────────────────
// Each PPTX slide = JPEG background (visual fidelity) + native text boxes (editable).
export async function captureArtifactAsPptx(content: string): Promise<Blob> {
  const { doc, win, cleanup } = await mountIframe(unwrapTags(content))
  try {
    const container = doc.body.firstElementChild as HTMLElement ?? doc.body
    const slideEls  = Array.from(container.children).filter(
      el => !['BUTTON', 'NAV', 'SCRIPT', 'STYLE'].includes(el.tagName),
    ) as HTMLElement[]

    // Flatten slides for capture (stack vertically, all visible)
    slideEls.forEach(el => {
      el.style.position   = 'static'
      el.style.display    = 'block'
      el.style.opacity    = '1'
      el.style.visibility = 'visible'
      el.style.width      = `${SLIDE_W_PX}px`
      el.style.minHeight  = `${SLIDE_H_PX}px`
      el.style.height     = `${SLIDE_H_PX}px`
      el.style.overflow   = 'hidden'
    })
    container.style.cssText += ';position:static;overflow:visible;height:auto;'
    await new Promise(r => setTimeout(r, 100))

    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_WIDE'

    const slideData: Array<{ canvas: HTMLCanvasElement; boxes: PptxTextBox[] }> = []

    for (const slideEl of slideEls) {
      // Capture screenshot of this slide
      const canvas = await html2canvas(slideEl, {
        scale: 2, useCORS: true,
        width: SLIDE_W_PX, height: SLIDE_H_PX,
        windowWidth: SLIDE_W_PX, windowHeight: SLIDE_H_PX,
        logging: false,
      })
      // Extract editable text elements
      const boxes = extractTextBoxes(slideEl, win)
      slideData.push({ canvas, boxes })
    }

    if (slideData.length === 0) {
      // Fallback: single slide from full body
      const body  = doc.body
      const canvas = await html2canvas(body, {
        scale: 2, useCORS: true, allowTaint: true,
        width: body.scrollWidth || SLIDE_W_PX, height: body.scrollHeight || SLIDE_H_PX,
        logging: false,
      })
      slideData.push({ canvas, boxes: [] })
    }

    for (const { canvas, boxes } of slideData) {
      const slide = pptx.addSlide()

      // Layer 1: full-slide JPEG background (design preserved)
      slide.addImage({ data: canvas.toDataURL('image/jpeg', 0.93), x: 0, y: 0, w: '100%', h: '100%' })

      // Layer 2: transparent text boxes for each text element (editable in Canva)
      for (const tb of boxes) {
        slide.addText(tb.text, {
          x: tb.x, y: tb.y, w: tb.w, h: tb.h,
          fontSize: tb.fontSize,
          color:    tb.color,
          bold:     tb.bold,
          italic:   tb.italic,
          align:    tb.align,
          fill:     { color: '000000', transparency: 100 },  // fully transparent
          line:     { color: '000000', transparency: 100, width: 0 },
          wrap:     true,
        })
      }
    }

    const blob = await (pptx as any).write('blob') as Blob
    logger.log('oauth', `PPTX gerado: ${slideData.length} slide(s), ${slideData.reduce((a, s) => a + s.boxes.length, 0)} text boxes — ${(blob.size / 1024).toFixed(0)} KB`)
    return blob
  } finally {
    cleanup()
  }
}

// Capture individual slide elements as canvases (used for slides-type artifacts)
async function captureSlides(doc: Document): Promise<HTMLCanvasElement[]> {
  const slides = Array.from(doc.querySelectorAll('.slide, [data-slide], section'))
  if (slides.length === 0) return []
  const results: HTMLCanvasElement[] = []
  for (const slide of slides) {
    const c = await html2canvas(slide as HTMLElement, {
      scale: 2, useCORS: true, allowTaint: true, logging: false,
    })
    results.push(c)
  }
  return results
}

// ── Public: capture webpage/spreadsheet as PDF ─────────────────────────────────
export async function captureArtifactAsPdf(content: string, type: ArtifactType): Promise<Blob> {
  const { doc, cleanup } = await mountIframe(unwrapTags(content))  // win unused for PDF
  try {
    let canvases = await (type === 'slides' ? captureSlides(doc) : Promise.resolve([]))

    if (canvases.length === 0) {
      const body = doc.body
      const w = body.scrollWidth || 1280
      const h = body.scrollHeight || 720
      const c = await html2canvas(body, {
        scale: 2, useCORS: true, allowTaint: true,
        width: w, height: h, windowWidth: w, windowHeight: h,
        scrollX: 0, scrollY: 0, logging: false,
      })
      canvases = [c]
    }

    const [first] = canvases
    const pw = first.width / 2
    const ph = first.height / 2
    const orient: 'l' | 'p' = pw >= ph ? 'l' : 'p'

    const pdf = new jsPDF({ orientation: orient, unit: 'px', format: [pw, ph], compress: true })
    canvases.forEach((c: HTMLCanvasElement, i: number) => {
      if (i > 0) pdf.addPage([pw, ph], orient)
      pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pw, ph)
    })
    return pdf.output('blob')
  } finally {
    cleanup()
  }
}

// ─── Import to Canva ───────────────────────────────────────────────────────────

export async function importToCanva(blob: Blob, title: string, mimeType: string): Promise<string> {
  const token    = await getValidToken()
  const safeName = title.slice(0, 50)
  const b64Title = btoa(unescape(encodeURIComponent(safeName)))
  const fmt      = mimeType.includes('presentation') ? 'PPTX' : 'PDF'
  logger.log('oauth', `Importando ${fmt} para Canva — "${safeName}" (${(blob.size / 1024).toFixed(0)} KB)`)

  // Start import job
  const importRes = await fetch(IMPORT_URL, {
    method:  'POST',
    headers: {
      'Authorization':   `Bearer ${token}`,
      'Content-Type':    'application/octet-stream',
      'Import-Metadata': JSON.stringify({ title_base64: b64Title, mime_type: mimeType }),
    },
    body: blob,
  })

  logger.log('oauth', `Import POST: HTTP ${importRes.status}`)
  if (!importRes.ok) {
    const errBody = await importRes.text().catch(() => '')
    logger.log('error', `Import falhou: ${importRes.status}`, { body: errBody })
    const err = JSON.parse(errBody || '{}') as { message?: string }
    throw new Error(err.message ?? `Erro ao importar: ${importRes.status}`)
  }

  const { job } = await importRes.json() as { job: { id: string; status: string } }
  logger.log('oauth', `Job de import criado: ${job.id}`)

  // Poll until complete (max 60s) with AbortController for cleanup
  const pollAbort = new AbortController()
  const pollTimeout = setTimeout(() => pollAbort.abort(), 60_000)
  try {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 1000))
      if (pollAbort.signal.aborted) break
      const pollRes = await fetch(`${IMPORT_URL}/${job.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: pollAbort.signal,
      })
      const { job: updated } = await pollRes.json() as {
        job: {
          id: string; status: string
          result?: { designs: Array<{ urls: { edit_url: string } }> }
          error?:  { message: string }
        }
      }
      logger.log('oauth', `Poll ${i + 1}: status=${updated.status}`)
      if (updated.status === 'success') {
        const editUrl = updated.result!.designs[0].urls.edit_url
        logger.log('oauth', `✓ Design pronto: ${editUrl}`)
        return editUrl
      }
      if (updated.status === 'failed') {
        logger.log('error', `Import falhou no Canva: ${updated.error?.message}`)
        throw new Error(updated.error?.message ?? 'Falha ao processar o design no Canva.')
      }
    }
    throw new Error('O import demorou demais. Tente novamente.')
  } finally {
    clearTimeout(pollTimeout)
  }
}

// ─── Slides JSON → native PPTX ────────────────────────────────────────────────
// Converts a SlidesJSON object to a fully native pptxgenjs PPTX blob.
// All elements (text, shapes, lines, icons) are individual editable objects in Canva.

const J_W = 13.33  // LAYOUT_WIDE inches
const J_H = 7.5

function pX(p: number) { return p / 100 * J_W }
function pY(p: number) { return p / 100 * J_H }
function noHash(hex: string) { return hex.replace(/^#/, '') }

type PptxSlide = ReturnType<PptxGenJS['addSlide']>

function addSlidesJsonElement(
  slide:  PptxSlide,
  el:     SlideElement,
  theme:  SlidesJSON['theme'],
  pptx:   PptxGenJS,
): void {
  if (el.type === 'text') {
    const te = el as TextEl
    slide.addText(te.text, {
      x:        pX(te.x), y: pY(te.y),
      w:        pX(te.w), h: pY(te.h),
      fontSize: te.size ?? 14,
      color:    noHash(te.color ?? theme.text),
      bold:     te.bold  ?? false,
      italic:   te.italic ?? false,
      align:    (te.align  ?? 'left') as 'left' | 'center' | 'right',
      valign:   (te.valign ?? 'middle') as 'top' | 'middle' | 'bottom',
      fontFace: te.font ?? theme.font,
      fill:     { color: '000000', transparency: 100 },
      line:     { color: '000000', transparency: 100, width: 0 },
      wrap:     true,
    })
    return
  }

  if (el.type === 'rect') {
    const re = el as RectEl
    slide.addShape(pptx.ShapeType.rect, {
      x: pX(re.x), y: pY(re.y),
      w: pX(re.w), h: pY(re.h),
      fill: (re.fill && re.fill !== 'transparent')
        ? { color: noHash(re.fill), transparency: re.opacity ?? 0 }
        : { color: 'FFFFFF', transparency: 100 },
      line: re.stroke
        ? { color: noHash(re.stroke), width: re.strokeWidth ?? 1 }
        : { color: 'FFFFFF', transparency: 100, width: 0 },
      ...(re.radius ? { rectRadius: re.radius / 72 } : {}),
    } as never)
    return
  }

  if (el.type === 'circle') {
    const ce = el as CircleEl
    slide.addShape(pptx.ShapeType.ellipse, {
      x: pX(ce.x), y: pY(ce.y),
      w: pX(ce.w), h: pY(ce.h),
      fill: (ce.fill && ce.fill !== 'transparent')
        ? { color: noHash(ce.fill), transparency: ce.opacity ?? 0 }
        : { color: 'FFFFFF', transparency: 100 },
      line: ce.stroke
        ? { color: noHash(ce.stroke), width: ce.strokeWidth ?? 1 }
        : { color: 'FFFFFF', transparency: 100, width: 0 },
    } as never)
    return
  }

  if (el.type === 'line') {
    const le = el as LineEl
    const x1 = pX(le.x1), y1 = pY(le.y1)
    const x2 = pX(le.x2), y2 = pY(le.y2)
    const dx = x2 - x1, dy = y2 - y1
    const len   = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx) * 180 / Math.PI
    slide.addShape(pptx.ShapeType.line, {
      x: x1, y: y1, w: len, h: 0,
      line: {
        color:    noHash(le.color ?? theme.primary),
        width:    le.width ?? 1,
        dashType: le.dash ? 'dash' : 'solid',
      },
      rotate: Math.round(angle),
    } as never)
    return
  }

  if (el.type === 'icon') {
    const ie = el as IconEl
    slide.addText(ie.char, {
      x: pX(ie.x), y: pY(ie.y),
      w: pX(ie.w), h: pY(ie.h),
      fontSize: ie.size ?? 24,
      color:    noHash(ie.color ?? theme.primary),
      align:    'center',
      valign:   'middle',
      fill:     { color: '000000', transparency: 100 },
      line:     { color: '000000', transparency: 100, width: 0 },
    })
    return
  }
}

export async function slidesJsonToPptx(json: SlidesJSON): Promise<Blob> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'

  for (const slideData of json.slides) {
    const slide = pptx.addSlide()

    // Background — solid color or gradient (as full-slide rect)
    const bg = slideData.bg ?? json.theme.bg
    if (typeof bg === 'string') {
      slide.background = { color: noHash(bg) }
    } else {
      const g = bg as GradientBg
      // pptxgenjs gradient background via full-slide shape
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: J_W, h: J_H,
        fill: {
          type:  'grad',
          stops: [
            { color: noHash(g.from), position: 0   },
            { color: noHash(g.to),   position: 100 },
          ],
          angle: g.angle ?? 135,
        },
        line: { color: noHash(g.from), transparency: 100, width: 0 },
      } as never)
    }

    // Elements
    for (const el of slideData.elements) {
      addSlidesJsonElement(slide, el, json.theme, pptx)
    }
  }

  const blob = await (pptx as any).write('blob') as Blob
  logger.log('agent', `slides-json PPTX: ${json.slides.length} slides — ${(blob.size / 1024).toFixed(0)} KB`)
  return blob
}
