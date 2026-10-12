export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mt-2">
      {/* R2-1D-SUB-01: mesma geometria da bolha inbound (raio 10, canto de cauda 3, borda 1px). */}
      <div className="bg-surface-800 border border-surface-700 rounded-[10px] rounded-bl-[3px] px-3 py-2.5 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-surface-500 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-surface-500 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-surface-500 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}
