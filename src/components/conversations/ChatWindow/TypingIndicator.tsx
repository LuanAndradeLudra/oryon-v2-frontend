export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mt-2">
      <div className="bg-surface-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}
