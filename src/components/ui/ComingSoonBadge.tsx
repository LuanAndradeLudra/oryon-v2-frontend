/** Small pill marking a control that's visible but not backed by the server yet — e.g. a field the backend doesn't persist, or a section waiting on a real endpoint. Keeps the "not implemented yet" signal visually consistent everywhere it shows up. */
export function ComingSoonBadge({ label = 'Em breve' }: { label?: string }) {
  return (
    <span className="inline-flex flex-shrink-0 items-center h-5 px-1.5 rounded-[6px] border border-dashed border-[var(--bd2)] text-2xs font-semibold whitespace-nowrap text-surface-400">
      {label}
    </span>
  )
}
