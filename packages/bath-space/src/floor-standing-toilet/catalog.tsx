'use client'
import { useCatalogPreferences } from '../shower-common/catalog-preferences'
import { useEditor } from '@pascal-app/editor'
import { CatalogEmptyState, CatalogGrid, CatalogHeading, CatalogItemCard } from '../catalog-ui'
import {
  FloorStandingToiletNode,
  FLOOR_STANDING_TOILET,
  toiletPresets,
} from './schema'
import {
  setToiletPlacementStyle,
  useToiletPlacementStyle,
} from './placement-settings'
const toiletThumbnails: Record<FloorStandingToiletNode['design'], string> = {
  'back-to-wall': new URL('./assets/back-to-wall.webp', import.meta.url).href,
  'compact-back-to-wall': new URL('./assets/compact-back-to-wall.webp', import.meta.url).href,
  'square-back-to-wall': new URL('./assets/square-back-to-wall.webp', import.meta.url).href,
  'close-coupled': new URL('./assets/close-coupled.webp', import.meta.url).href,
  'one-piece': new URL('./assets/one-piece.webp', import.meta.url).href,
  'traditional': new URL('./assets/traditional.webp', import.meta.url).href,
  'two-piece-round': new URL('./assets/two-piece-round.webp', import.meta.url).href,
  'two-piece-elongated': new URL('./assets/two-piece-elongated.webp', import.meta.url).href,
  'two-piece-skirted': new URL('./assets/two-piece-skirted.webp', import.meta.url).href,
  'two-piece-classic': new URL('./assets/two-piece-classic.webp', import.meta.url).href,
  'one-piece-compact': new URL('./assets/one-piece-compact.webp', import.meta.url).href,
  'one-piece-low-profile': new URL('./assets/one-piece-low-profile.webp', import.meta.url).href,
  'one-piece-square': new URL('./assets/one-piece-square.webp', import.meta.url).href,
  'one-piece-sculpted': new URL('./assets/one-piece-sculpted.webp', import.meta.url).href,
}

export function ToiletPreview({
  design = 'back-to-wall',
}: {
  design?: FloorStandingToiletNode['design']
}) {
  return <img src={toiletThumbnails[design]} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
}

export default function ToiletCatalog({ query }: { query: string }) {
  const preferences = useCatalogPreferences()

  const key = (id: string) => `floor-standing-toilet:${id}`
  const words = query.trim().toLowerCase().replaceAll('-', ' ').split(/\s+/).filter(Boolean)
  const style = useToiletPlacementStyle(),
    active = useEditor((s) => s.tool === FLOOR_STANDING_TOILET)
  const visible = toiletPresets.filter(p =>
    words.every(word => `floor standing toilet ${p.label}`.toLowerCase().replaceAll('-', ' ').includes(word)))
  return (
    <section className="space-y-2 border-t border-border/60 pt-3">
      <CatalogHeading count={visible.length}>Floor standing toilets</CatalogHeading>
      <CatalogGrid>
        {visible.map((p) => (
          <div key={p.design} className="relative group">
            <CatalogItemCard type="button"
              aria-label={`Add ${p.label} floor standing toilet`}
              aria-pressed={active && style === p.design}
              onClick={() => {
                preferences.remember(key(p.design))
                setToiletPlacementStyle(p.design)
                useEditor.getState().setTool(FLOOR_STANDING_TOILET)
              }} label={p.label}>
              <ToiletPreview design={p.design} />
            </CatalogItemCard>

          </div>
        ))}
      </CatalogGrid>
      {!visible.length && (
        <CatalogEmptyState>
          {'No matching items.'}
        </CatalogEmptyState>
      )}
      {active && (
        <p role="status" className="text-[11px] text-muted-foreground">
          Click a wall to place. Esc to cancel.
        </p>
      )}
    </section>
  )
}
