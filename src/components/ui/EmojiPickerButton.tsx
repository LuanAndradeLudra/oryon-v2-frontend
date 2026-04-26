import { useRef, useState, useEffect } from 'react'
import { Smile } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmojiPickerButtonProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onEmojiInsert: (newValue: string) => void
  className?: string
  position?: 'top' | 'bottom'
}

export function EmojiPickerButton({
  textareaRef,
  onEmojiInsert,
  className,
  position = 'top',
}: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pickerContainerRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<unknown>(null)

  // Build picker once when first opened
  useEffect(() => {
    if (!open || pickerRef.current) return

    let cancelled = false

    Promise.all([
      import('emoji-mart').then((m) => m.Picker),
      import('@emoji-mart/data/sets/15/apple.json'),
    ]).then(([Picker, data]) => {
      if (cancelled || !pickerContainerRef.current) return

      // Use vanilla Picker — functions survive because we pass them only at
      // construction time, never through attributeChangedCallback.
      pickerRef.current = new (Picker as new (opts: object) => unknown)({
        ref: pickerContainerRef,
        data,
        set: 'apple',
        theme: 'dark',
        locale: 'pt',
        previewPosition: 'none',
        skinTonePosition: 'none',
        maxFrequentRows: 2,
        getSpritesheetURL: () => '/emoji-apple-sprite.png',
        getImageURL: (_set: string, unified: string) => `/emoji-apple/${unified}.png`,
        onEmojiSelect: (emoji: { native: string }) => {
          const textarea = textareaRef.current
          if (!textarea) { onEmojiInsert(emoji.native); return }
          const start = textarea.selectionStart ?? textarea.value.length
          const end   = textarea.selectionEnd   ?? textarea.value.length
          const newValue = textarea.value.slice(0, start) + emoji.native + textarea.value.slice(end)
          onEmojiInsert(newValue)
          requestAnimationFrame(() => {
            textarea.focus()
            const pos = start + emoji.native.length
            textarea.setSelectionRange(pos, pos)
          })
        },
      })
    })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center justify-center text-surface-400 hover:text-surface-200 transition-colors',
          className,
        )}
        title="Emoji"
      >
        <Smile className="w-4.5 h-4.5" />
      </button>

      {/* Picker container — always in DOM so Picker can mount into it */}
      <div
        ref={pickerContainerRef}
        className={cn(
          'absolute right-0 z-50',
          position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          open ? 'block' : 'hidden',
        )}
      />
    </div>
  )
}
