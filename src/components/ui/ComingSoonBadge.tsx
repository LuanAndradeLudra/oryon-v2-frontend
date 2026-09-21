/** Small pill marking a control that's visible but not backed by the server yet — e.g. a field the backend doesn't persist, or a section waiting on a real endpoint. Keeps the "not implemented yet" signal visually consistent everywhere it shows up. */
export function ComingSoonBadge({ label = 'Em breve' }: { label?: string }) {
  return (
    <span className="inline-flex items-center h-[18px] px-1.5 rounded-[4px] border border-dashed border-[var(--bd2)] text-3xs font-bold uppercase tracking-[.08em] text-surface-500">
      {label}
    </span>
  )
}
