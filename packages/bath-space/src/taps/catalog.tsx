'use client'

import { useEditor } from '@pascal-app/editor'
import { getTapPreset, tapPresets } from './presets'
import { setTapPlacementPreset, useTapPlacementPreset } from './placement-settings'
import { TAP } from './schema'
import { CatalogEmptyState } from '../catalog-ui'

export default function TapCatalog({ query }: { query: string }) {
  const selected = useTapPlacementPreset()
  const placing = useEditor(state => state.tool === TAP)
  const setTool = useEditor(state => state.setTool)
  const search = query.trim().toLowerCase()
  const groups = (['countertop', 'wall'] as const).map((mount) => {
    const mountMatches = !search || search === 'tap' || search === 'taps' || mount.includes(search)
    return {
      mount,
      items: tapPresets.filter((preset) => preset.mount === mount && (mountMatches || preset.label.toLowerCase().includes(search))),
    }
  }).filter(({ items }) => items.length > 0)
  if (search && groups.length === 0) return null
  const matching = groups.flatMap((group) => group.items)
  return <section className="border-t border-border/60 pt-2">
    <details open className="group">
      <summary className="mb-2 flex h-7 cursor-pointer list-none items-center justify-between text-xs font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        Taps
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4" /></svg>
      </summary>
      <div className="flex flex-col gap-2">
    {groups.map(({ mount, items }) => <details key={mount} open>
      <summary className="mb-2 cursor-pointer rounded-md bg-secondary/40 px-2 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-ring">
        {mount === 'countertop' ? 'Countertop' : 'Wall mounted'}
      </summary>
      <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} aria-label={`${mount === 'countertop' ? 'Countertop' : 'Wall mounted'} taps`}>
        {items.map(preset => <div key={preset.id} className="group relative">
          <button type="button" aria-label={`Select ${preset.label} tap`} aria-pressed={placing && selected === preset.id}
            onClick={() => { setTapPlacementPreset(preset.id); setTool(TAP) }}
            className={`w-full overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring ${placing && selected === preset.id ? 'border-primary ring-1 ring-primary/50' : 'border-border bg-secondary/40 hover:bg-accent/30'}`}>
            <img src={preset.thumbnail} alt="" loading="lazy" style={{ aspectRatio: '7 / 4' }} className="aspect-[7/4] w-full object-cover" />
            <span style={{ minHeight: 38 }} className="block min-h-[38px] px-2 py-1.5 text-[11px] font-medium leading-4">{preset.label}</span>
          </button>
          
        </div>)}
      </div>
    </details>)}
    {search && matching.length === 0 && <CatalogEmptyState>No taps match "{query.trim()}".</CatalogEmptyState>}
    {placing && <p role="status" className="text-[11px] leading-relaxed text-muted-foreground">
      {getTapPreset(selected).mount === 'wall' ? 'Click a wall to attach.' : 'Click a basin to attach or replace its tap.'} Esc to cancel.
    </p>}
      </div>
    </details>
  </section>
}
