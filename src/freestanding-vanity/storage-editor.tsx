'use client'

import { SliderControl } from '@pascal-app/editor'
import { type StorageBay, type VanityNode } from './schema'
import { vanityBays } from './layout'

export function CustomStorageEditor({ node, onChange }: {
  node: VanityNode; onChange: (patch: Partial<VanityNode>) => void
}) {
  const sections = node.storageBays
  const layout = vanityBays(node)
  const update = (index: number, patch: Partial<StorageBay>) => onChange({
    storageBays: sections.map((section, i) => i === index ? { ...section, ...patch } : section),
  })
  const selectClass = 'h-7 rounded-md border border-border/50 bg-secondary px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30'
  return <div className="flex flex-col gap-2">
    <p className="px-3 text-[11px] leading-relaxed text-muted-foreground">Sections run left to right. Widths and drawer heights are proportional and fit the cabinet automatically.</p>
    {sections.map((section, index) => <div key={section.id} className="border-t border-border/50 pt-2">
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-xs font-medium">Section {index + 1} <span className="font-normal text-muted-foreground">· {Math.round((layout[index]?.width ?? 0) * 100)} cm</span></span>
        <button type="button" disabled={sections.length <= 1} aria-label={`Remove section ${index + 1}`}
          className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-30"
          onClick={() => onChange({ storageBays: sections.filter((_, i) => i !== index) })}>Remove</button>
      </div>
      <label className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-foreground/80">
        Contents
        <select aria-label={`Section ${index + 1} contents`} value={section.kind} className={selectClass}
          onChange={(event) => update(index, { kind: event.target.value as StorageBay['kind'] })}>
          <option value="drawers">Drawers</option><option value="doors">Doors</option><option value="open">Open shelves</option>
        </select>
      </label>
      <SliderControl label={`Section ${index + 1} width`} value={section.widthWeight} min={0.5} max={2} step={0.05} precision={2} unit="×"
        onChange={(widthWeight) => update(index, { widthWeight })} />
      {section.kind === 'drawers' ? <>
        <SliderControl label="Drawer count" value={section.drawerHeights.length} min={1} max={4} step={1} precision={0}
          onChange={(count) => update(index, { drawerHeights: Array.from({ length: Math.round(count) }, (_, i) => section.drawerHeights[i] ?? 1) })} />
        {section.drawerHeights.map((height, row) => <SliderControl key={row} label={`Drawer ${row + 1} height`} value={height}
          min={0.5} max={2} step={0.05} precision={2} unit="×"
          onChange={(value) => update(index, { drawerHeights: section.drawerHeights.map((entry, i) => i === row ? value : entry) })} />)}
      </> : <>
        {section.kind === 'doors' && <SliderControl label="Door count" value={section.doorCount} min={1} max={2} step={1} precision={0}
          onChange={(doorCount) => update(index, { doorCount: Math.round(doorCount) })} />}
        <SliderControl label="Shelf count" value={section.shelves} min={0} max={3} step={1} precision={0}
          onChange={(shelves) => update(index, { shelves: Math.round(shelves) })} />
      </>}
    </div>)}
    <button type="button" disabled={sections.length >= 3}
      className="mx-3 h-8 rounded-md border border-border/50 text-xs text-foreground/80 hover:bg-accent/40 disabled:opacity-40"
      onClick={() => {
        let suffix = 1
        while (sections.some((section) => section.id === `section-${suffix}`)) suffix++
        onChange({ storageBays: [...sections, { id: `section-${suffix}`, kind: 'drawers', widthWeight: 1, drawerHeights: [1, 1], doorCount: 1, shelves: 1 }] })
      }}>Add section {sections.length >= 3 ? '(3 maximum)' : '+'}</button>
  </div>
}
