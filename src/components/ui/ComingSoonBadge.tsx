/** Small pill marking a control that's visible but not backed by the server yet — e.g. a field the backend doesn't persist, or a section waiting on a real endpoint. Keeps the "not implemented yet" signal visually consistent everywhere it shows up. */
export function ComingSoonBadge({ label = 'Em breve' }: { label?: string }) {
  return (
    <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-surface-700 text-surface-300">
      {label}
    </span>
  )
}
