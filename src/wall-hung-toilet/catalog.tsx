'use client'
import { useCatalogPreferences } from '../shower-common/catalog-preferences'
import { useEditor } from '@pascal-app/editor'
import { CatalogEmptyState, CatalogGrid, CatalogHeading, CatalogItemCard } from '../catalog-ui'
import { WallHungToiletNode, WALL_HUNG_TOILET, toiletPresets } from './schema'
import {
  setToiletPlacementStyle,
  useToiletPlacementStyle,
} from './placement-settings'
const toiletThumbnails: Record<WallHungToiletNode['style'], string> = {
  'rounded': new URL('./assets/rounded.webp', import.meta.url).href,
  'd-shaped': new URL('./assets/d-shaped.webp', import.meta.url).href,
  'square': new URL('./assets/square.webp', import.meta.url).href,
  'compact': new URL('./assets/compact.webp', import.meta.url).href,
  'elongated': new URL('./assets/elongated.webp', import.meta.url).href,
}

export function ToiletPreview({
  style = 'd-shaped',
}: {
  style?: WallHungToiletNode['style']
}) {
  return <img src={toiletThumbnails[style]} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
}

export default function ToiletCatalog({ query }: { query: string }) {
  const preferences = useCatalogPreferences()

  const key = (id: string) => `wall-hung-toilet:${id}`
  const words = query.trim().toLowerCase().replaceAll('-', ' ').split(/\s+/).filter(Boolean)
  const style = useToiletPlacementStyle(),
    active = useEditor((s) => s.tool === WALL_HUNG_TOILET)
  const visible = toiletPresets.filter(p =>
    words.every(word => `wall hung toilet ${p.label}`.toLowerCase().replaceAll('-', ' ').includes(word)))
  return (
    <section className="space-y-2 border-t border-border/60 pt-3">
      <CatalogHeading count={visible.length}>Wall hung toilets</CatalogHeading>
      <CatalogGrid>
        {visible.map((p) => (
          <div key={p.style} className="relative group">
            <CatalogItemCard type="button"
              aria-label={`Add ${p.label} wall hung toilet`}
              aria-pressed={active && style === p.style}
              onClick={() => {
                preferences.remember(key(p.style))
                setToiletPlacementStyle(p.style)
                useEditor.getState().setTool(WALL_HUNG_TOILET)
              }} label={p.label}>
              <ToiletPreview style={p.style} />
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
