import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react'
import DOMPurify from 'dompurify'
import { createPortal } from 'react-dom'
import { X, Copy, Check, Code2, Table2, ListOrdered, Download, Pencil, Eye, Globe, Presentation, Sheet, Maximize2, Loader2, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useArtifactContext } from '@/contexts/ArtifactContext'
import type { ArtifactType } from '@/contexts/ArtifactContext'
import { authorizeCanva, captureArtifactAsPptx, captureArtifactAsPdf, slidesJsonToPptx, importToCanva, isCanvaConnected, disconnectCanva } from '@/services/canvaService'
import { logger } from '@/services/debugLogger'
import { renderSlidesJson } from '@/lib/slidesRenderer'
import type { SlidesJSON } from '@/types/slidesJson'
import {
  parseContent,
  stripInline,
  stripHeading,
  isHeadingLine,
  type Segment,
} from '@/lib/copilotParser'
import { isValidJson, safeFilename } from '@/lib/artifactSafety'

// ─── Sanitization — prevent XSS from AI-generated content ─────────────────────

const SAFE_PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'thead', 'tbody', 'tr', 'td', 'th', 'caption',
    'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 's', 'br', 'hr',
    'img', 'a', 'style', 'section', 'article', 'header', 'footer', 'nav',
    'main', 'figure', 'figcaption', 'blockquote', 'pre', 'code',
    'html', 'head', 'body', 'meta', 'title', 'link',
  ],
  ALLOWED_ATTR: [
    'class', 'style', 'src', 'alt', 'href', 'target', 'rel',
    'width', 'height', 'colspan', 'rowspan', 'id', 'lang', 'charset',
    'name', 'content', 'type',
  ],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
}

/** Sanitize HTML content before writing to new window or iframe */
function sanitizeArtifactHtml(html: string): string {
  return DOMPurify.sanitize(html, SAFE_PURIFY_CONFIG)
}

// ─── Type metadata ─────────────────────────────────────────────────────────────

function typeLabel(type: ArtifactType): string {
  if (type === 'webpage')        return 'Landing Page'
  if (type === 'spreadsheet')    return 'Planilha'
  if (type === 'slides')         return 'Apresentação'
  if (type === 'slides-json')    return 'Apresentação'
  if (type === 'react-artifact') return 'Componente interativo'
  return 'Documento'
}

function TypeIcon({ type, className }: { type: ArtifactType; className?: string }) {
  if (type === 'webpage')        return <Globe className={className} />
  if (type === 'spreadsheet')    return <Sheet className={className} />
  if (type === 'slides' || type === 'slides-json') return <Presentation className={className} />
  if (type === 'react-artifact') return <Code2 className={className} />
  return null
}

// ─── PDF Export ────────────────────────────────────────────────────────────────

function segmentsToHTML(segments: Segment[]): string {
  return segments.map((seg) => {
    if (seg.kind === 'prose') {
      return seg.lines
        .map((line) => {
          const t = line.trim()
          if (!t) return '<br>'
          if (t === '---' || t === '***') return '<hr>'
          if (isHeadingLine(t)) {
            const level = (t.match(/^(#{1,6})\s/) ?? ['', '#'])[1].length
            return `<h${level}>${escHTML(stripInline(stripHeading(t)))}</h${level}>`
          }
          const clean = stripInline(t.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, ''))
          return `<p>${escHTML(clean)}</p>`
        })
        .filter(Boolean)
        .join('\n')
    }
    if (seg.kind === 'table') {
      const headers = seg.headers.map((h) => `<th>${escHTML(stripInline(h))}</th>`).join('')
      const rows = seg.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escHTML(stripInline(cell))}</td>`).join('')}</tr>`)
        .join('\n')
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`
    }
    if (seg.kind === 'plan') {
      const items = seg.items.map((it) => `<li>${escHTML(stripInline(it))}</li>`).join('\n')
      return `<h3>${escHTML(seg.title)}</h3><ol>${items}</ol>`
    }
    if (seg.kind === 'code') {
      return `<pre><code>${escHTML(seg.content)}</code></pre>`
    }
    return ''
  }).join('\n\n')
}

function escHTML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Export HTML artifacts (slides, webpage, spreadsheet) as PDF via print dialog.
// Injects per-type print CSS so slides become one-per-page and colors are preserved.
function exportHTMLAsPDF(content: string, title: string, type: ArtifactType) {
  const html = unwrapArtifactTags(content)
  const win = window.open('', '_blank')
  if (!win) return

  // Per-type print optimisations
  let typePrintCSS = ''
  if (type === 'slides') {
    // Slides use position:absolute children inside a position:relative container.
    // For print: flatten the container and give each slide its own page.
    typePrintCSS = `
      body > * {
        position: static !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
      }
      body > * > *:not(button):not(nav) {
        position: static !important;
        display: block !important;
        width: 100% !important;
        min-height: 100vh !important;
        page-break-after: always !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
      body > * > *:last-child { page-break-after: avoid !important; }
      button, nav, [role="navigation"] { display: none !important; }`
  } else if (type === 'spreadsheet') {
    typePrintCSS = `
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ccc !important; padding: 6px 10px; }
      thead { display: table-header-group; }`
  }
  // webpage: base styles are sufficient

  const printBlock = `
<style>
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  @media print {
    ${typePrintCSS}
  }
</style>
<script>
  window.addEventListener('load', function() {
    // Show all hidden slides before printing
    document.querySelectorAll('[style*="display:none"], [style*="display: none"]')
      .forEach(function(el) { el.style.removeProperty('display'); });
    setTimeout(function() { window.print(); }, 350);
  });
<\/script>`

  // Inject before </head>; fall back to prepending if no </head>
  const modified = html.includes('</head>')
    ? html.replace('</head>', printBlock + '\n</head>')
    : printBlock + html

  win.document.write(sanitizeArtifactHtml(modified))
  win.document.close()
}

function exportToPDF(content: string, title: string) {
  const segments = parseContent(content)
  const bodyHTML = segmentsToHTML(segments)
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${escHTML(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.7; color: #1a1a2e; max-width: 760px; margin: 0 auto; padding: 48px 40px; }
    h1 { font-size: 26px; font-weight: 700; margin-bottom: 8px; color: #0f0f1a; }
    h2 { font-size: 19px; font-weight: 700; margin: 28px 0 10px; color: #1a1a2e; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    h3 { font-size: 15px; font-weight: 600; margin: 22px 0 8px; color: #374151; }
    p  { margin-bottom: 10px; color: #374151; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th { background: #f3f4f6; font-weight: 600; text-align: left; padding: 10px 12px; border: 1px solid #d1d5db; }
    td { padding: 9px 12px; border: 1px solid #e5e7eb; color: #374151; }
    tr:nth-child(even) td { background: #f9fafb; }
    ol { padding-left: 20px; margin: 12px 0; }
    li { margin-bottom: 8px; color: #374151; }
    pre { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 14px 0; overflow-x: auto; }
    code { font-family: 'Menlo', 'Consolas', monospace; font-size: 12px; }
    .doc-header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 32px; }
    .doc-meta { font-size: 12px; color: #9ca3af; margin-top: 4px; }
    @media print { body { padding: 32px; } pre { white-space: pre-wrap; } }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1>${escHTML(title)}</h1>
    <p class="doc-meta">Gerado por Oryon AI · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  </div>
  ${sanitizeArtifactHtml(bodyHTML)}
  <script>window.onload = () => { window.print() }<\/script>
</body>
</html>`)
  win.document.close()
}

// ─── Document segment renderers ────────────────────────────────────────────────

const PanelProse = memo(function PanelProse({ lines }: { lines: string[] }) {
  const nodes: React.ReactNode[] = []
  let key = 0
  for (const line of lines) {
    const t = line.trim()
    if (!t) { nodes.push(<div key={key++} className="h-3" />); continue }
    if (t === '---' || t === '***' || t === '___') {
      nodes.push(<hr key={key++} className="border-surface-700/60 my-4" />)
      continue
    }
    if (isHeadingLine(t)) {
      const level = (t.match(/^(#{1,6})\s/) ?? ['', '#'])[1].length
      nodes.push(
        <p key={key++} className={cn(
          'font-semibold text-surface-50 leading-snug',
          level === 1 ? 'text-xl mt-6 mb-2 first:mt-0' :
          level === 2 ? 'text-base mt-5 mb-1.5 first:mt-0' :
                        'text-sm mt-4 mb-1 first:mt-0 text-surface-200',
        )}>
          {stripInline(stripHeading(t))}
        </p>
      )
      continue
    }
    const clean = stripInline(t.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, ''))
    nodes.push(<p key={key++} className="text-sm text-surface-300 leading-relaxed">{clean}</p>)
  }
  return <div className="flex flex-col gap-1">{nodes}</div>
})

const PanelCode = memo(function PanelCode({ lang, content }: { lang: string; content: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => navigator.clipboard.writeText(content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  return (
    <div className="rounded-xl overflow-hidden border border-surface-700/50 bg-surface-950 my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-900 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-surface-500" />
          <span className="text-[11px] font-semibold text-surface-400 font-mono">{lang}</span>
          <span className="text-[10px] text-surface-600">{content.split('\n').length} linhas</span>
        </div>
        <button onClick={copy} className="p-1 rounded text-surface-500 hover:text-surface-300 transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-status-active" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="text-xs font-mono text-surface-300 px-4 py-4 overflow-x-scroll leading-relaxed">
        <code>{content}</code>
      </pre>
    </div>
  )
})

const PanelPlan = memo(function PanelPlan({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl overflow-hidden border border-brand-500/15 bg-surface-900/40 my-3">
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-900/60 border-b border-surface-800/60">
        <ListOrdered className="w-4 h-4 text-brand-400" />
        <span className="text-sm font-semibold text-surface-200">{title}</span>
        <span className="text-[11px] text-surface-500 ml-1">· {items.length} etapas</span>
      </div>
      <div className="px-4 py-4 flex flex-col gap-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3.5">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-600/15 border border-brand-500/25 flex items-center justify-center text-[11px] font-bold text-brand-400 mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-surface-200 leading-relaxed flex-1">{stripInline(item)}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

const PanelTable = memo(function PanelTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="rounded-xl overflow-hidden border border-surface-700/50 bg-surface-900/40 my-3">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-900/60 border-b border-surface-800/60">
        <Table2 className="w-3.5 h-3.5 text-surface-400" />
        <span className="text-[11px] font-semibold text-surface-300">Tabela</span>
        <span className="text-[10px] text-surface-500">· {rows.length} linhas</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700/60">
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-semibold text-surface-200 whitespace-nowrap">
                  {stripInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={cn('border-b border-surface-800/40 last:border-0', ri % 2 === 1 && 'bg-surface-800/20')}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-3 text-surface-300 leading-snug">{stripInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
})

function renderSegment(seg: Segment, i: number) {
  if (seg.kind === 'code')  return <PanelCode  key={i} lang={seg.lang}      content={seg.content} />
  if (seg.kind === 'plan')  return <PanelPlan  key={i} title={seg.title}    items={seg.items}     />
  if (seg.kind === 'table') return <PanelTable key={i} headers={seg.headers} rows={seg.rows}      />
  return <PanelProse key={i} lines={seg.lines} />
}

// ─── HTML/Slides/Spreadsheet renderer (sandboxed iframe) ───────────────────────
// Uses Blob URL + imperative src assignment for maximum reliability.
// srcDoc has React reconciliation quirks; blob: URLs bypass all of them.
// Also strips artifact wrapper tags defensively (handles any extraction edge cases).

const ARTIFACT_WRAPPER_TAGS = ['webpage', 'spreadsheet', 'slides'] as const

function unwrapArtifactTags(raw: string): string {
  for (const tag of ARTIFACT_WRAPPER_TAGS) {
    const open = `<${tag}>`
    const close = `</${tag}>`
    const idx = raw.indexOf(open)
    if (idx !== -1) {
      const end = raw.indexOf(close, idx + open.length)
      return end !== -1
        ? raw.slice(idx + open.length, end).trim()
        : raw.slice(idx + open.length).trim()
    }
  }
  return raw
}

function IframeRenderer({ content }: { content: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const html = unwrapArtifactTags(content)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    if (iframeRef.current) iframeRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [content])

  return (
    <iframe
      ref={iframeRef}
      title="artifact-preview"
      sandbox="allow-same-origin"
      className="w-full h-full border-0"
      style={{ minHeight: 0 }}
    />
  )
}

// ─── Slides JSON preview (JSON → HTML → iframe) ────────────────────────────────

function SlidesJsonRenderer({ content }: { content: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    let html: string
    try {
      const json = JSON.parse(content) as SlidesJSON
      html = renderSlidesJson(json)
    } catch {
      html = '<body style="background:#0A0F0F;color:#EF4444;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;font-size:14px;"><p>JSON inválido ou incompleto — aguardando geração…</p></body>'
    }
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    if (iframeRef.current) iframeRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [content])

  return (
    <iframe
      ref={iframeRef}
      title="slides-json-preview"
      sandbox="allow-same-origin"
      className="w-full h-full border-0"
      style={{ minHeight: 0 }}
    />
  )
}

// ─── Phase 12: Interactive React artifact (Babel in a sandboxed iframe) ─────────

/** Build a standalone HTML document that loads React + Recharts + Tailwind via
 *  CDN and transpiles the user's JSX with Babel standalone. Uses srcDoc on
 *  the iframe so the whole document is handed to the browser atomically,
 *  avoiding race conditions between the React src assignment and the
 *  iframe's layout. */
function buildReactArtifactHTML(code: string): string {
  // Strip bits that don't work in the browser-only sandbox. Keep this list
  // minimal but defensive — models occasionally ignore prompt rules.
  //   - markdown code fences around the whole block (```tsx ... ```)
  //   - export default / export const
  //   - import statements (React, ReactDOM, Recharts, PropTypes are global)
  //   - TypeScript interface/type declarations (keep simple annotations)
  const cleaned = code
    // Markdown fence pairs at the start/end, with optional language tag
    .replace(/^\s*```(?:tsx|jsx|ts|js|javascript|typescript)?\s*\n/i, '')
    .replace(/\n?```\s*$/i, '')
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+/gm, '')
    .replace(/^\s*import[^\n]*\n/gm, '')
    .replace(/^\s*(interface|type)\s+[A-Z][\w]*\s*[={][^\n]*$[\s\S]*?^}\s*$/gm, '')

  const escaped = cleaned.replace(/<\/script>/gi, '<\\/script>')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>React Artifact</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html, body { height: 100%; margin: 0; background: #0A0F0F; color: #ECF1F1; font-family: -apple-system, 'Segoe UI', sans-serif; }
    #root { min-height: 100%; }

    /* ---- Loading overlay (friendly skeleton, no technical jargon) ---- */
    #artifact-loader {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 18px;
      background: radial-gradient(circle at 50% 35%, rgba(45,212,191,0.08), transparent 60%), #0A0F0F;
      transition: opacity .25s ease;
      pointer-events: none;
    }
    #artifact-loader.hidden { opacity: 0; }

    /* Spinning gradient ring */
    .artifact-spinner {
      width: 52px; height: 52px;
      border-radius: 50%;
      background: conic-gradient(from 0deg, #14B8A6, #2DD4BF, #99F6E4, #14B8A6);
      mask: radial-gradient(circle, transparent 55%, black 56%);
      -webkit-mask: radial-gradient(circle, transparent 55%, black 56%);
      animation: artifact-spin 1.2s linear infinite;
    }
    @keyframes artifact-spin { to { transform: rotate(360deg); } }

    .artifact-loader-label {
      font-size: 13px; color: #D3DDDD; font-weight: 500; letter-spacing: 0.01em;
    }
    .artifact-loader-hint {
      font-size: 11px; color: #8FA5A5; margin-top: -8px;
    }

    /* Subtle pulsing dots */
    .artifact-dots { display: inline-flex; gap: 3px; margin-left: 2px; }
    .artifact-dots span {
      width: 3px; height: 3px; border-radius: 50%;
      background: currentColor; opacity: 0.4;
      animation: artifact-pulse 1.3s infinite;
    }
    .artifact-dots span:nth-child(2) { animation-delay: .18s; }
    .artifact-dots span:nth-child(3) { animation-delay: .36s; }
    @keyframes artifact-pulse {
      0%, 100% { opacity: 0.2; transform: translateY(0); }
      40%      { opacity: 1;   transform: translateY(-2px); }
    }

    /* ---- Error banner (separate from loader) ---- */
    #artifact-error {
      display: none;
      position: absolute; top: 0; left: 0; right: 0;
      background: #450a0a; color: #fca5a5;
      font: 13px ui-monospace, SFMono-Regular, Menlo, monospace;
      padding: 12px 16px; white-space: pre-wrap;
      z-index: 10;
    }
    #artifact-error.visible { display: block; }
  </style>
</head>
<body>
  <div id="artifact-loader">
    <div class="artifact-spinner"></div>
    <div class="artifact-loader-label">
      <span id="artifact-loader-message">Preparando visualização</span><span class="artifact-dots"><span></span><span></span><span></span></span>
    </div>
    <div class="artifact-loader-hint">Carregando ambiente interativo…</div>
  </div>
  <div id="artifact-error"></div>
  <div id="root"></div>
  <script>
    // Loader overlay (friendly, no technical stage names exposed to the user)
    // is separate from the error banner. setStatus only swaps the overlay's
    // subtle label; the technical stage ('Carregando Babel...') is logged
    // to the console for devs but never surfaced to the UI.
    var loaderEl    = document.getElementById('artifact-loader');
    var loaderMsgEl = document.getElementById('artifact-loader-message');
    var errorEl     = document.getElementById('artifact-error');

    function setStatus(stage) {
      // Keep the visible message generic — only the console sees the stage.
      console.log('[react-artifact] ' + stage);
    }
    function fail(msg) {
      console.error('[react-artifact]', msg);
      if (errorEl) {
        errorEl.className = 'visible';
        errorEl.textContent = 'Não foi possível carregar o artefato. ' + msg;
      }
      // Hide the loader so the user doesn't see it spinning forever.
      if (loaderEl) loaderEl.classList.add('hidden');
    }
    function clearStatus() {
      if (loaderEl) {
        loaderEl.classList.add('hidden');
        // Fully remove after the fade so it doesn't intercept events.
        setTimeout(function () { if (loaderEl && loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl); }, 280);
      }
    }

    window.addEventListener('error', function (e) {
      fail(e.message || (e.error && e.error.message) || String(e));
    });

    // Load CDN scripts SEQUENTIALLY so we know exactly which one failed.
    // NO crossorigin attribute — otherwise the browser applies CORS mode and
    // blocks any CDN that doesn't emit Access-Control-Allow-Origin headers.
    // Script tags without crossorigin execute under a no-CORS policy.
    function loadScript(src) {
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = function () { resolve(); };
        s.onerror = function () { reject(new Error('Falha ao carregar ' + src)); };
        document.body.appendChild(s);
      });
    }

    (async function () {
      try {
        setStatus('Carregando React…');
        await loadScript('https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js');
        if (!window.React) throw new Error('React não disponível após carga');

        setStatus('Carregando ReactDOM…');
        await loadScript('https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js');
        if (!window.ReactDOM) throw new Error('ReactDOM não disponível após carga');

        // Recharts is optional. Pin to 2.x which ships a stable UMD build.
        // Recharts 2.x depends on prop-types (React.PropTypes was removed
        // in React 18), so we load prop-types first. Both failing is
        // treated as non-fatal -- chart-using artifacts will then fail
        // at execution time with a clearer message than a blank iframe.
        setStatus('Carregando PropTypes…');
        try {
          await loadScript('https://cdn.jsdelivr.net/npm/prop-types@15.8.1/prop-types.min.js');
        } catch (ptErr) {
          console.warn('[react-artifact] prop-types não carregou:', ptErr);
        }

        setStatus('Carregando Recharts…');
        try {
          await loadScript('https://cdn.jsdelivr.net/npm/recharts@2.12.7/umd/Recharts.min.js');
        } catch (rechartsErr) {
          console.warn('[react-artifact] Recharts não carregou (opcional):', rechartsErr);
        }

        setStatus('Carregando Babel…');
        await loadScript('https://cdn.jsdelivr.net/npm/@babel/standalone@7.24.7/babel.min.js');
        if (!window.Babel) throw new Error('Babel não disponível após carga');

        setStatus('Compilando componente…');
        var src = ${JSON.stringify(escaped)};
        if (!src || !src.trim()) { fail('Código do artefato está vazio'); return; }

        var out;
        try {
          out = Babel.transform(src, { presets: ['react', ['typescript', { allExtensions: true, isTSX: true }]] }).code;
        } catch (compileErr) {
          fail('Erro de compilação Babel: ' + ((compileErr && compileErr.message) || compileErr));
          return;
        }

        setStatus('Executando…');
        try {
          new Function(out)();
        } catch (runErr) {
          fail('Erro de execução: ' + ((runErr && runErr.message) || runErr));
          return;
        }

        // React's render is asynchronous (it schedules a commit for the next
        // microtask). Wait for #root to actually receive child nodes via a
        // MutationObserver, with a generous timeout. This avoids a false
        // 'nothing rendered' error when the component IS mounting.
        var root = document.getElementById('root');
        if (!root) { fail('Elemento #root não encontrado.'); return; }
        if (root.childNodes.length > 0) { clearStatus(); return; }

        var resolved = false;
        var observer = new MutationObserver(function () {
          if (root.childNodes.length > 0 && !resolved) {
            resolved = true;
            observer.disconnect();
            clearStatus();
          }
        });
        observer.observe(root, { childList: true, subtree: true });

        setTimeout(function () {
          if (!resolved) {
            resolved = true;
            observer.disconnect();
            if (root.childNodes.length > 0) {
              clearStatus();
            } else {
              fail('O código foi executado mas nada foi renderizado em #root após 3s. Certifique-se de chamar ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App)).');
            }
          }
        }, 3000);
      } catch (err) {
        fail((err && err.message) || String(err));
      }
    })();
  </script>
</body>
</html>`
}

function InteractiveArtifactRenderer({ content }: { content: string }) {
  // Use srcDoc instead of blob URL — the browser consumes the whole document
  // synchronously on first paint, avoiding iframe-src assignment races.
  const html = buildReactArtifactHTML(content)

  return (
    <iframe
      key={content}  // force fresh iframe when content changes
      title="react-artifact"
      // allow-scripts only — NO allow-same-origin, so the iframe cannot reach
      // our origin even though it loads scripts from CDNs.
      sandbox="allow-scripts"
      srcDoc={html}
      className="w-full h-full border-0 bg-slate-900"
      style={{ minHeight: 0 }}
    />
  )
}

// ─── Edit mode textarea ────────────────────────────────────────────────────────

function EditPane({ content, onUpdate }: { content: string; onUpdate: (v: string) => void }) {
  return (
    <textarea
      value={content}
      onChange={(e) => onUpdate(e.target.value)}
      className="w-full h-full resize-none bg-surface-950 text-sm font-mono text-surface-300 px-6 py-6 outline-none leading-relaxed"
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
    />
  )
}

// ─── Fullscreen overlay ────────────────────────────────────────────────────────

function FullscreenOverlay({ content, title, type, onClose }: { content: string; title: string; type: ArtifactType; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100] bg-surface-950 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-950/90 border-b border-surface-800/60 flex-shrink-0">
        <span className="text-xs font-medium text-surface-400 truncate">{title}</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors ml-4 flex-shrink-0"
          title="Fechar tela cheia (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {type === 'slides-json'
          ? <SlidesJsonRenderer content={content} />
          : type === 'react-artifact'
            ? <InteractiveArtifactRenderer content={content} />
            : <IframeRenderer content={content} />}
      </div>
    </motion.div>,
    document.body
  )
}

// ─── Panel ─────────────────────────────────────────────────────────────────────

// ─── Canva brand logo (inline SVG) ────────────────────────────────────────────

function CanvaLogo({ className }: { className?: string }) {
  return (
    <img
      src="/canva-logo.webp"
      alt="Canva"
      className={className}
      style={{ borderRadius: '50%' }}
    />
  )
}

// ─── Canva export button ───────────────────────────────────────────────────────

type CanvaStatus = 'idle' | 'authorizing' | 'generating' | 'uploading' | 'done' | 'error'

const CANVA_LABELS: Record<CanvaStatus, string> = {
  idle:        'Canva',
  authorizing: 'Conectando...',
  generating:  'Gerando...',
  uploading:   'Enviando...',
  done:        'Aberto!',
  error:       'Tentar novamente',
}

// ─── Version navigator (shows under title when artifact has 2+ versions) ──────

function VersionNav({
  artifact,
  onSwitch,
}: {
  artifact: { id: string; versionIndex: number; versions: Array<unknown> }
  onSwitch: (id: string, index: number) => void
}) {
  const total = artifact.versions.length
  const current = artifact.versionIndex + 1
  const canPrev = artifact.versionIndex > 0
  const canNext = artifact.versionIndex < total - 1
  return (
    <div className="flex items-center gap-0.5 rounded border border-surface-700/60 bg-surface-800/60 pl-1 pr-0.5 py-0.5">
      <button
        type="button"
        onClick={() => canPrev && onSwitch(artifact.id, artifact.versionIndex - 1)}
        disabled={!canPrev}
        className="flex h-4 w-4 items-center justify-center rounded text-surface-400 hover:text-surface-100 disabled:opacity-30"
        title="Versão anterior"
      >
        <ChevronLeft className="h-3 w-3" />
      </button>
      <span className="px-0.5 text-[10px] font-medium text-surface-300 tabular-nums">
        v{current}<span className="text-surface-500">/{total}</span>
      </span>
      <button
        type="button"
        onClick={() => canNext && onSwitch(artifact.id, artifact.versionIndex + 1)}
        disabled={!canNext}
        className="flex h-4 w-4 items-center justify-center rounded text-surface-400 hover:text-surface-100 disabled:opacity-30"
        title="Próxima versão"
      >
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  )
}

export function ArtifactPanel() {
  const { artifact, artifacts, closeArtifact, openExisting, updateArtifactContent, setArtifactVersion } = useArtifactContext()
  const [copied, setCopied] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [canvaStatus, setCanvaStatus] = useState<CanvaStatus>('idle')
  const [canvaError, setCanvaError] = useState<string | null>(null)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  // Close switcher on outside click
  useEffect(() => {
    if (!switcherOpen) return
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [switcherOpen])

  // Expensive parse — only re-run when the actual content changes, not on copy/edit toggles
  const segments = useMemo(
    () => artifact ? parseContent(artifact.content) : [],
    [artifact?.content],
  )

  const openFullscreen  = useCallback(() => setFullscreen(true),  [])
  const closeFullscreen = useCallback(() => setFullscreen(false), [])

  // Reset modes when artifact changes
  useEffect(() => { setEditMode(false); setFullscreen(false) }, [artifact?.id])

  const copy = () => {
    if (!artifact) return
    navigator.clipboard.writeText(artifact.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const downloadHTML = () => {
    if (!artifact) return
    const blob = new Blob([artifact.content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = safeFilename(artifact.title, 'artefato') + '.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  const isHTML      = artifact?.type === 'webpage' || artifact?.type === 'slides' || artifact?.type === 'spreadsheet'
  const isSlidesJson = artifact?.type === 'slides-json'
  const isReactArtifact = artifact?.type === 'react-artifact'
  const hasPreview   = isHTML || isSlidesJson || isReactArtifact

  const openInCanva = useCallback(async () => {
    if (!artifact || canvaStatus !== 'idle') return
    setCanvaError(null)

    // Open destination window synchronously (before any await) to avoid popup blocker,
    // then immediately write an animated transition page so it's never blank.
    const destWin = window.open('', '_blank')
    if (destWin) {
      const origin = window.location.origin
      destWin.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Abrindo no Canva…</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0A0F0F;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#ECF1F1}
.card{text-align:center;width:360px}
.logo-wrap{width:72px;height:72px;border-radius:18px;overflow:hidden;margin:0 auto 20px;box-shadow:0 8px 32px rgba(45,212,191,.30)}
.logo-wrap img{width:100%;height:100%;display:block}
h1{font-size:22px;font-weight:700;margin-bottom:6px}
#msg{font-size:14px;color:#8FA5A5;margin-bottom:28px;min-height:20px}
.track{height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden}
.fill{height:100%;background:linear-gradient(90deg,#14B8A6,#2DD4BF);border-radius:2px;width:8%;transition:width .6s ease}
#step{margin-top:12px;font-size:11px;color:#6B8080;letter-spacing:.08em;text-transform:uppercase}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
.blink{animation:blink 1.4s infinite}
</style>
</head>
<body>
<div class="card">
  <div class="logo-wrap"><img src="${origin}/canva-logo.webp" alt="Canva"></div>
  <h1>Abrindo no Canva</h1>
  <p id="msg" class="blink">Preparando seu design…</p>
  <div class="track"><div class="fill" id="fill"></div></div>
  <p id="step">Iniciando</p>
</div>
</body>
</html>`)
      destWin.document.close()
    }

    const upd = (msg: string, step: string, pct: number) => {
      if (!destWin || destWin.closed) return
      try {
        const d = destWin.document
        const msgEl  = d.getElementById('msg')  as HTMLElement | null
        const stepEl = d.getElementById('step') as HTMLElement | null
        const fillEl = d.getElementById('fill') as HTMLElement | null
        if (msgEl)  msgEl.textContent  = msg
        if (stepEl) stepEl.textContent = step
        if (fillEl) fillEl.style.width = `${pct}%`
      } catch { /* window closed or cross-origin */ }
    }

    try {
      if (!isCanvaConnected()) {
        setCanvaStatus('authorizing')
        upd('Conectando ao Canva…', 'Autorização', 15)
        await authorizeCanva()
      }
      setCanvaStatus('generating')
      upd('Gerando arquivo do design…', 'Processando', 35)

      let blob: Blob
      let mimeType: string

      if (artifact.type === 'slides-json') {
        // Native PPTX from JSON — all elements fully editable in Canva
        const json = JSON.parse(artifact.content) as SlidesJSON
        blob     = await slidesJsonToPptx(json)
        mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      } else if (artifact.type === 'slides') {
        // Legacy HTML slides → hybrid PPTX (JPEG bg + text boxes)
        blob     = await captureArtifactAsPptx(artifact.content)
        mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      } else {
        blob     = await captureArtifactAsPdf(artifact.content, artifact.type)
        mimeType = 'application/pdf'
      }

      setCanvaStatus('uploading')
      upd('Enviando para o Canva…', 'Upload', 65)
      const editUrl = await importToCanva(blob, artifact.title, mimeType)

      upd('Abrindo seu design…', 'Pronto!', 100)
      setCanvaStatus('done')

      // Brief pause at 100% so user sees the completed state before redirect
      await new Promise(r => setTimeout(r, 700))
      if (destWin && !destWin.closed) {
        destWin.location.href = editUrl
      } else {
        window.open(editUrl, '_blank')
      }
      setTimeout(() => setCanvaStatus('idle'), 2500)
    } catch (err: unknown) {
      destWin?.close()
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
      logger.log('error', `Canva export falhou: ${msg}`, { stack: err instanceof Error ? err.stack?.slice(0, 300) : undefined })

      // If session expired, clear token so next click re-triggers OAuth
      if (msg.includes('expirada') || msg.includes('expirou') || msg.includes('Reconecte')) {
        disconnectCanva()
        setCanvaError('Sessão expirada. Clique novamente para reconectar ao Canva.')
      } else {
        setCanvaError(msg)
      }
      setCanvaStatus('error')
      setTimeout(() => { setCanvaStatus('idle'); setCanvaError(null) }, 6000)
    }
  }, [artifact, canvaStatus])

  return (
    <>
    <AnimatePresence>
      {artifact && (
        <motion.div
          key="artifact-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 792, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="flex-shrink-0 flex flex-col bg-surface-950 border-l border-surface-800 overflow-hidden"
          style={{ minWidth: 0 }}
        >
          <div className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-800/60 flex-shrink-0">
              {artifact.type !== 'document' && (
                <div className="w-7 h-7 rounded-lg bg-surface-800/80 border border-surface-700/50 flex items-center justify-center flex-shrink-0">
                  <TypeIcon type={artifact.type} className="w-3.5 h-3.5 text-brand-400" />
                </div>
              )}

              {/* Title / artifact switcher */}
              <div ref={switcherRef} className="flex-1 min-w-0 relative">
                {artifacts.length > 1 ? (
                  <button
                    onClick={() => setSwitcherOpen((v) => !v)}
                    className="flex items-center gap-1.5 max-w-full group"
                  >
                    <p className="text-sm font-semibold text-surface-100 truncate group-hover:text-brand-300 transition-colors">
                      {artifact.title}
                    </p>
                    <ChevronDown className={cn(
                      'w-3.5 h-3.5 flex-shrink-0 text-surface-500 transition-transform',
                      switcherOpen && 'rotate-180',
                    )} />
                  </button>
                ) : (
                  <p className="text-sm font-semibold text-surface-100 truncate">{artifact.title}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-surface-500">{typeLabel(artifact.type)} · gerado pela IA</p>
                  {artifact.versions.length > 1 && (
                    <VersionNav artifact={artifact} onSwitch={setArtifactVersion} />
                  )}
                </div>

                {/* Switcher dropdown */}
                <AnimatePresence>
                  {switcherOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className="absolute top-full left-0 mt-2 w-72 bg-surface-900 border border-surface-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
                    >
                      {artifacts.map((art) => (
                        <button
                          key={art.id}
                          onClick={() => { openExisting(art.id); setSwitcherOpen(false) }}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                            art.id === artifact.id
                              ? 'bg-brand-600/15 text-brand-200'
                              : 'hover:bg-surface-800/60 text-surface-300',
                          )}
                        >
                          <div className={cn(
                            'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                            art.id === artifact.id ? 'bg-brand-600/20' : 'bg-surface-800',
                          )}>
                            {art.type === 'webpage'     ? <Globe        className="w-3 h-3 text-brand-400" /> :
                             art.type === 'spreadsheet' ? <Sheet        className="w-3 h-3 text-brand-400" /> :
                             art.type === 'slides' || art.type === 'slides-json' ? <Presentation className="w-3 h-3 text-brand-400" /> :
                             <FileText className="w-3 h-3 text-surface-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate leading-snug">{art.title}</p>
                            <p className="text-[10px] text-surface-500 mt-0.5">{typeLabel(art.type)}</p>
                          </div>
                          {art.id === artifact.id && (
                            <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">

                {/* Edit / Preview toggle — only for document and spreadsheet;
                    editing raw JSX / slides JSON as plain text is not useful. */}
                {(artifact.type === 'document' || artifact.type === 'spreadsheet') && (
                  <button
                    onClick={() => setEditMode((v) => !v)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors border text-[11px] font-medium',
                      editMode
                        ? 'bg-brand-600/15 border-brand-500/30 text-brand-300'
                        : 'border-surface-700/50 text-surface-400 hover:text-surface-100 hover:bg-surface-800/60 hover:border-surface-600',
                    )}
                    title={editMode ? 'Visualizar' : 'Editar'}
                  >
                    {editMode
                      ? <><Eye className="w-3 h-3" /><span>Visualizar</span></>
                      : <><Pencil className="w-3 h-3" /><span>Editar</span></>}
                  </button>
                )}

                {/* Fullscreen — for HTML and slides-json artifacts */}
                {hasPreview && (
                  <button
                    onClick={openFullscreen}
                    className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800/60 transition-colors"
                    title="Tela cheia"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Copy */}
                <button
                  onClick={copy}
                  className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800/60 transition-colors"
                  title="Copiar conteúdo"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-status-active" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* Export buttons */}
                {isReactArtifact ? (
                  // react-artifact: download as standalone interactive HTML
                  // (the same document we render inside the sandboxed iframe,
                  // so the file is self-contained and loads its CDN deps).
                  <button
                    onClick={() => {
                      try {
                        const html = buildReactArtifactHTML(artifact.content)
                        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                        const url  = URL.createObjectURL(blob)
                        const a    = document.createElement('a')
                        a.href     = url
                        a.download = safeFilename(artifact.title, 'componente') + '.html'
                        a.click()
                        URL.revokeObjectURL(url)
                      } catch (err) {
                        logger.log('error', `HTML interativo download falhou: ${err instanceof Error ? err.message : String(err)}`)
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800/60 transition-colors border border-surface-700/50 hover:border-surface-600"
                    title="Baixar componente como HTML interativo"
                  >
                    <Download className="w-3 h-3" />
                    <span className="text-[11px] font-medium">HTML interativo</span>
                  </button>
                ) : isSlidesJson ? (
                  // slides-json: download as PPTX. Disable while the JSON is
                  // still being streamed (or is otherwise invalid) so the
                  // user never clicks into a cryptic JSON.parse error.
                  (() => {
                    const slidesValid = isValidJson(artifact.content)
                    return (
                      <button
                        disabled={!slidesValid}
                        onClick={async () => {
                          if (!slidesValid) return
                          try {
                            const json = JSON.parse(artifact.content) as SlidesJSON
                            const blob = await slidesJsonToPptx(json)
                            const url  = URL.createObjectURL(blob)
                            const a    = document.createElement('a')
                            a.href     = url
                            a.download = safeFilename(artifact.title, 'apresentacao') + '.pptx'
                            a.click()
                            URL.revokeObjectURL(url)
                          } catch (err) {
                            logger.log('error', `PPTX download falhou: ${err instanceof Error ? err.message : String(err)}`)
                          }
                        }}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors',
                          slidesValid
                            ? 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60 border-surface-700/50 hover:border-surface-600'
                            : 'text-surface-600 border-surface-800 cursor-not-allowed',
                        )}
                        title={slidesValid ? 'Baixar como PPTX' : 'Aguardando geração completa…'}
                      >
                        <Download className="w-3 h-3" />
                        <span className="text-[11px] font-medium">PPTX</span>
                      </button>
                    )
                  })()
                ) : isHTML ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={downloadHTML}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800/60 transition-colors border border-surface-700/50 hover:border-surface-600"
                      title="Baixar arquivo HTML"
                    >
                      <Download className="w-3 h-3" />
                      <span className="text-[11px] font-medium">HTML</span>
                    </button>
                    <button
                      onClick={() => exportHTMLAsPDF(artifact.content, artifact.title, artifact.type)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800/60 transition-colors border border-surface-700/50 hover:border-surface-600"
                      title="Baixar como PDF"
                    >
                      <Download className="w-3 h-3" />
                      <span className="text-[11px] font-medium">PDF</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => exportToPDF(artifact.content, artifact.title)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800/60 transition-colors border border-surface-700/50 hover:border-surface-600"
                    title="Exportar como PDF"
                  >
                    <Download className="w-3 h-3" />
                    <span className="text-[11px] font-medium">PDF</span>
                  </button>
                )}

                {/* Abrir no Canva — HTML and slides-json when Client ID is configured */}
                {(isHTML || isSlidesJson) && import.meta.env.VITE_CANVA_CLIENT_ID && (
                  <button
                    onClick={openInCanva}
                    disabled={canvaStatus !== 'idle' && canvaStatus !== 'error'}
                    title={
                      canvaStatus === 'error' && canvaError
                        ? canvaError
                        : canvaStatus === 'idle'
                        ? 'Abrir no Canva para editar'
                        : CANVA_LABELS[canvaStatus]
                    }
                    className={cn(
                      'flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg transition-all border text-[11px] font-semibold',
                      canvaStatus === 'done'
                        ? 'bg-status-active-bg border-status-active-border text-status-active'
                        : canvaStatus === 'error'
                        ? 'bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-500/10'
                        : 'border-[#8438FF]/40 text-[#c084fc] hover:bg-[#8438FF]/10 hover:border-[#8438FF]/70 hover:text-[#d8b4fe]',
                      (canvaStatus !== 'idle' && canvaStatus !== 'error') && 'opacity-60 cursor-not-allowed',
                    )}
                  >
                    {/* Icon area */}
                    {canvaStatus === 'authorizing' || canvaStatus === 'generating' || canvaStatus === 'uploading'
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                      : canvaStatus === 'done'
                      ? <Check className="w-3.5 h-3.5 flex-shrink-0" />
                      : canvaStatus === 'error'
                      ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      : <CanvaLogo className="w-4 h-4 flex-shrink-0" />}
                    <span>{CANVA_LABELS[canvaStatus]}</span>
                  </button>
                )}

                {/* Close */}
                <button
                  onClick={closeArtifact}
                  className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800/60 transition-colors ml-1"
                  title="Fechar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {editMode ? (
                <EditPane
                  content={artifact.content}
                  onUpdate={(v) => updateArtifactContent(artifact.id, v)}
                />
              ) : isSlidesJson ? (
                <SlidesJsonRenderer content={artifact.content} />
              ) : isReactArtifact ? (
                <InteractiveArtifactRenderer content={artifact.content} />
              ) : isHTML ? (
                <IframeRenderer content={artifact.content} />
              ) : (
                <div className="h-full overflow-y-auto px-6 py-6" style={{ contain: 'layout style', willChange: 'transform' }}>
                  <div className="flex flex-col gap-1">
                    {segments.map((seg, i) => renderSegment(seg, i))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {fullscreen && artifact && (
        <FullscreenOverlay
          key="fullscreen"
          content={artifact.content}
          title={artifact.title}
          type={artifact.type}
          onClose={closeFullscreen}
        />
      )}
    </AnimatePresence>
    </>
  )
}
