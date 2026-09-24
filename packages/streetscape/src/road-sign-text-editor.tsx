'use client'

import type { RoadSignNode } from './schema'

export default function RoadSignTextEditor({
  node,
  onUpdate,
}: {
  node: RoadSignNode
  onUpdate: (patch: Partial<RoadSignNode>) => void
}) {
  return (
    <label className="flex flex-col gap-1 px-2 py-1 text-sidebar-foreground/70 text-xs">
      <span>Display text</span>
      <input
        className="rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 py-1.5 text-sidebar-foreground outline-none focus:border-sidebar-ring"
        maxLength={32}
        onChange={(event) => onUpdate({ text: event.target.value })}
        placeholder="Uses catalog default"
        type="text"
        value={node.text ?? ''}
      />
    </label>
  )
}
