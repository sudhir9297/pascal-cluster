export default function AreaHeading({ title, onBrowse }: { title: string; onBrowse: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
      <button type="button" className="min-h-8 shrink-0 rounded-md border-0 bg-transparent px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring motion-safe:[&:active:not(:focus-visible)]:scale-[0.98]" onClick={onBrowse}>Open catalog</button>
    </div>
  )
}
