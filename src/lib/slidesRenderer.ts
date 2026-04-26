// ─── Slides JSON → HTML renderer ──────────────────────────────────────────────
// Converts a SlidesJSON object into a self-contained HTML presentation page.
// Used by ArtifactPanel to preview slides-json artifacts in an iframe.

import type {
  SlidesJSON,
  SlideData,
  SlideElement,
  GradientBg,
  TextEl,
  RectEl,
  CircleEl,
  LineEl,
  IconEl,
} from '@/types/slidesJson'

// ─── Helpers ───────────────────────────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>')
}

function bgCss(bg: SlideData['bg'], themeBg: string): string {
  if (!bg) return `background-color:${themeBg}`
  if (typeof bg === 'string') return `background-color:${bg}`
  const g = bg as GradientBg
  return `background:linear-gradient(${g.angle ?? 135}deg,${g.from},${g.to})`
}

// ─── Element renderers ─────────────────────────────────────────────────────────

function renderEl(el: SlideElement, theme: SlidesJSON['theme']): string {
  // Lines: compute length + angle accounting for 16:9 aspect ratio
  if (el.type === 'line') {
    const le = el as LineEl
    const dx = le.x2 - le.x1
    // 1% height ≈ 0.5625 × 1% width in pixels (9/16 = 0.5625)
    const dy = (le.y2 - le.y1) * 0.5625
    const len = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx) * 180 / Math.PI
    const lw = le.width ?? 1
    const col = le.color ?? theme.primary
    const dashStyle = le.dash
      ? `border-bottom:${lw}px dashed ${col};background:transparent;height:0;`
      : `background-color:${col};height:${lw}px;`
    return `<div style="position:absolute;left:${le.x1}%;top:${le.y1}%;width:${len.toFixed(3)}%;${dashStyle}transform:rotate(${angle.toFixed(3)}deg);transform-origin:left center;pointer-events:none;"></div>`
  }

  if (el.type === 'text') {
    const te = el as TextEl
    const vaMap: Record<string, string> = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }
    const va = vaMap[te.valign ?? 'middle'] ?? 'center'
    const jc = te.align === 'center' ? 'center' : te.align === 'right' ? 'flex-end' : 'flex-start'
    return [
      `<div style="position:absolute;left:${te.x}%;top:${te.y}%;width:${te.w}%;height:${te.h}%;`,
      `display:flex;align-items:${va};justify-content:${jc};`,
      `font-size:${te.size ?? 14}pt;color:${te.color ?? theme.text};`,
      `font-weight:${te.bold ? '700' : '400'};font-style:${te.italic ? 'italic' : 'normal'};`,
      `font-family:'${te.font ?? theme.font}',sans-serif;text-align:${te.align ?? 'left'};`,
      `overflow:hidden;word-wrap:break-word;padding:2px 4px;line-height:1.25;">`,
      `${esc(te.text)}</div>`,
    ].join('')
  }

  if (el.type === 'rect') {
    const re = el as RectEl
    const fill = re.fill ?? 'transparent'
    const border = re.stroke ? `border:${re.strokeWidth ?? 1}px solid ${re.stroke};` : ''
    const br = re.radius ? `border-radius:${re.radius}pt;` : ''
    const op = re.opacity !== undefined ? `opacity:${1 - re.opacity / 100};` : ''
    return `<div style="position:absolute;left:${re.x}%;top:${re.y}%;width:${re.w}%;height:${re.h}%;background-color:${fill};${border}${br}${op}pointer-events:none;"></div>`
  }

  if (el.type === 'circle') {
    const ce = el as CircleEl
    const fill = ce.fill ?? 'transparent'
    const border = ce.stroke ? `border:${ce.strokeWidth ?? 1}px solid ${ce.stroke};` : ''
    const op = ce.opacity !== undefined ? `opacity:${1 - ce.opacity / 100};` : ''
    return `<div style="position:absolute;left:${ce.x}%;top:${ce.y}%;width:${ce.w}%;height:${ce.h}%;background-color:${fill};${border}border-radius:50%;${op}pointer-events:none;"></div>`
  }

  if (el.type === 'icon') {
    const ie = el as IconEl
    return [
      `<div style="position:absolute;left:${ie.x}%;top:${ie.y}%;width:${ie.w}%;height:${ie.h}%;`,
      `display:flex;align-items:center;justify-content:center;`,
      `font-size:${ie.size ?? 24}pt;color:${ie.color ?? theme.primary};`,
      `font-family:sans-serif;text-align:center;overflow:hidden;">`,
      `${esc(ie.char)}</div>`,
    ].join('')
  }

  return ''
}

// ─── Slide renderer ────────────────────────────────────────────────────────────

function renderSlide(slide: SlideData, theme: SlidesJSON['theme']): string {
  const bg = bgCss(slide.bg, theme.bg)
  const els = slide.elements.map((el) => renderEl(el, theme)).join('\n')
  return `<div class="slide" style="${bg};overflow:hidden;">\n${els}\n</div>`
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function renderSlidesJson(json: SlidesJSON): string {
  const slidesHtml = json.slides.map((s) => renderSlide(s, json.theme)).join('\n')
  const fontParam  = encodeURIComponent(json.theme.font).replace(/%20/g, '+')
  const total      = json.slides.length

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(json.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=${fontParam}:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow:hidden;background:#000;}
.slides-wrap{position:relative;width:100%;height:100%;}
.slide{position:absolute;top:0;left:0;width:100%;height:100%;display:none;}
.slide.active{display:block;}
.nav-btn{position:fixed;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.45);color:#fff;border:none;width:38px;height:38px;cursor:pointer;font-size:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:100;transition:background .15s;user-select:none;line-height:1;}
.nav-btn:hover{background:rgba(0,0,0,.75);}
#nav-prev{left:10px;}
#nav-next{right:10px;}
.slide-counter{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.55);color:rgba(255,255,255,.85);font-family:sans-serif;font-size:11px;padding:3px 11px;border-radius:20px;z-index:100;letter-spacing:.5px;}
</style>
</head>
<body>
<div class="slides-wrap">
${slidesHtml}
</div>
<button class="nav-btn" id="nav-prev" onclick="go(-1)">&#8249;</button>
<button class="nav-btn" id="nav-next" onclick="go(1)">&#8250;</button>
<div class="slide-counter" id="cnt">1 / ${total}</div>
<script>
var cur=0;
var slides=document.querySelectorAll('.slide');
if(slides[0])slides[0].classList.add('active');
function go(n){
  slides[cur].classList.remove('active');
  cur=(cur+n+slides.length)%slides.length;
  slides[cur].classList.add('active');
  document.getElementById('cnt').textContent=(cur+1)+' / '+slides.length;
}
document.addEventListener('keydown',function(e){
  if(e.key==='ArrowRight')go(1);
  if(e.key==='ArrowLeft')go(-1);
});
</script>
</body>
</html>`
}
