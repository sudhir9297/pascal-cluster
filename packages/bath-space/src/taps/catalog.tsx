'use client'

import { useCatalogPreferences } from '../shower-common/catalog-preferences'
import { useEditor } from '@pascal-app/editor'
import { getTapPreset, tapPresets } from './presets'
import { setTapPlacementPreset, useTapPlacementPreset } from './placement-settings'
import { TAP } from './schema'
import { CatalogEmptyState, CatalogGrid, CatalogItemCard } from '../catalog-ui'

export default function TapCatalog({ query }: { query: string }) {
  const preferences = useCatalogPreferences()

  const key = (id: string) => `tap:${id}`
  const selected = useTapPlacementPreset()
  const placing = useEditor(state => state.tool === TAP)
  const setTool = useEditor(state => state.setTool)
  const search = query.trim().toLowerCase()
  const words = search.split(/\s+/).filter(Boolean)
  const groups = (['countertop', 'wall'] as const).map((mount) => {
    return {
      mount,
      items: tapPresets.filter((preset) => preset.mount === mount && words.every(word => `tap taps ${mount === 'wall' ? 'wall mounted' : 'countertop'} ${preset.label}`.toLowerCase().includes(word))),
    }
  }).filter(({ items }) => items.length > 0)
  const matching = groups.flatMap((group) => group.items)
  return <section className="border-t border-border/60 pt-2">
    <details open className="group">
      <summary className="mb-2 flex h-7 cursor-pointer list-none items-center justify-between text-xs font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <span className="flex flex-1 items-center justify-between gap-2 pr-2">Taps
          <span className="text-[11px] font-normal tabular-nums text-muted-foreground">{matching.length} {matching.length === 1 ? 'style' : 'styles'}</span>
        </span>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4" /></svg>
      </summary>
      <div className="flex flex-col gap-2">
    {groups.map(({ mount, items }) => <details key={mount} open>
      <summary className="mb-2 cursor-pointer rounded-md bg-secondary/40 px-2 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-ring">
        {mount === 'countertop' ? 'Countertop' : 'Wall mounted'}
      </summary>
      <CatalogGrid aria-label={`${mount === 'countertop' ? 'Countertop' : 'Wall mounted'} taps`}>
        {items.map(preset => <div key={preset.id} className="group relative">
          <CatalogItemCard type="button"
            aria-label={`Select ${preset.label} tap`}
            aria-pressed={placing && selected === preset.id}
            onClick={() => { preferences.remember(key(preset.id)); setTapPlacementPreset(preset.id); setTool(TAP) }} label={preset.label}>
            <img src={preset.thumbnail} alt="" loading="lazy" className="h-full w-full object-contain" />
          </CatalogItemCard>

        </div>)}
      </CatalogGrid>
    </details>)}
    {matching.length === 0 && <CatalogEmptyState>{'No matching taps.'}</CatalogEmptyState>}
    {placing && <p role="status" className="text-[11px] leading-relaxed text-muted-foreground">
      {getTapPreset(selected).mount === 'wall' ? 'Click a wall to attach.' : 'Click a basin to attach or replace its tap.'} Esc to cancel.
    </p>}
      </div>
    </details>
  </section>
}
