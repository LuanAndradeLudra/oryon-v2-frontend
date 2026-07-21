/**
 * Apple/WhatsApp emoji rendering via emoji-mart web components.
 *
 * Usage:
 *   <Emoji native="👋" />                     — single emoji as Apple image
 *   <EmojiText text="Olá! 👋 Bem-vindo 🎉" /> — mixed text with Apple emojis
 *   <EmojiHighlight text={msg} query={q} />    — highlight + Apple emojis (internal chat)
 */

import { createElement, type ReactNode } from 'react'

// Register the <em-emoji> web component globally once — async para manter a lib
// emoji-mart (~200KB) e o dataset Apple (~478KB) fora do chunk de entrada.
// Custom elements fazem upgrade automático quando definidos, então <em-emoji>
// já renderizados no DOM passam a exibir o emoji assim que o init completa.
// O dataset Apple é usado porque contém as coordenadas x,y do sprite sheet;
// o @emoji-mart/data genérico as omite. Sprite e PNGs servidos localmente.
void (async () => {
  const [{ init }, data] = await Promise.all([
    import('emoji-mart'),
    import('@emoji-mart/data/sets/15/apple.json'),
  ])
  init({
    data: data.default,
    set: 'apple',
    getSpritesheetURL: () => '/emoji-apple-sprite.png',
    getImageURL: (_set: string, unified: string) => `/emoji-apple/${unified}.png`,
  })
})()

// TypeScript types for the custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'em-emoji': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        native?: string
        id?: string
        set?: string
        size?: string | number
        fallback?: string
        'skin-tone'?: number
      }
    }
  }
}

/**
 * Regex that matches Unicode emoji sequences including:
 * - Basic emoji presentation characters
 * - Extended pictographics with optional variation selector (FE0F)
 * - Emoji modifier sequences (skin tones)
 * - ZWJ sequences (e.g. 👨‍👩‍👧, 🏳️‍🌈)
 * - Keycap sequences (1️⃣)
 * - Regional indicators (🇧🇷)
 */
const EMOJI_RE =
  /\p{Regional_Indicator}\p{Regional_Indicator}|(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\uFE0F|\u20E3)?(?:\p{Emoji_Modifier})?(?:\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\uFE0F|\u20E3)?(?:\p{Emoji_Modifier}))*/gu

/** Single Apple-style emoji rendered via the emoji-mart web component. */
export function Emoji({ native, size = '1.1em' }: { native: string; size?: string | number }) {
  return createElement('em-emoji', { native, set: 'apple', size, style: { display: 'inline-block', verticalAlign: '-0.2em' } })
}

/**
 * Splits `text` into alternating string / Emoji nodes so that every
 * emoji character is rendered using the Apple set.
 */
export function EmojiText({ text, className }: { text: string; className?: string }) {
  const nodes = splitEmoji(text)
  if (className) return <span className={className}>{nodes}</span>
  return <>{nodes}</>
}

/**
 * Like EmojiText but also wraps search-query matches in a <mark>.
 * Used in internal-chat MessageBubble.
 */
export function EmojiHighlight({
  text,
  query,
}: {
  text: string
  query?: string
}): ReactNode {
  if (!query?.trim()) return <EmojiText text={text} />

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-400/40 text-inherit rounded px-0.5">
            <EmojiText text={part} />
          </mark>
        ) : (
          <EmojiText key={i} text={part} />
        ),
      )}
    </>
  )
}

// ─── Internal helper ─────────────────────────────────────────────────────────

function splitEmoji(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const re = new RegExp(EMOJI_RE.source, 'gu')
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    nodes.push(<Emoji key={key++} native={match[0]} />)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes.length > 0 ? nodes : [text]
}
