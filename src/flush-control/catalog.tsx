'use client'
import { CatalogGrid, CatalogHeading, CatalogItemCard } from '../catalog-ui'
import { useEditor } from '@pascal-app/editor'
import { flushPlatePresets, WALL_FLUSH_PLATE } from './schema'
import {
  setFlushPlatePlacementShape,
  useFlushPlatePlacementShape,
} from './placement-settings'
const flushPlateThumbnails: Record<string, string> = {
  'rectangle': new URL('./assets/rectangle.webp', import.meta.url).href,
  'rounded': new URL('./assets/rounded.webp', import.meta.url).href,
  'square': new URL('./assets/square.webp', import.meta.url).href,
  'round': new URL('./assets/round.webp', import.meta.url).href,
  'oval': new URL('./assets/oval.webp', import.meta.url).href,
}
export function FlushPlatePreview({ shape = 'rounded' }: { shape?: string }) {
  return <img src={flushPlateThumbnails[shape] ?? flushPlateThumbnails.rounded} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
}
export default function FlushPlateCatalog({
  query,



}: {
  query: string

}) {
  const shape = useFlushPlatePlacementShape(),
    active = useEditor((s) => s.tool === WALL_FLUSH_PLATE)
  const visible = flushPlatePresets.filter(
    (p) =>
      `toilet wall flush button plate ${p.label}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  )
  return (
    <section className="space-y-2 border-t border-border/60 pt-3">
      <CatalogHeading>Wall flush plate</CatalogHeading>
      <CatalogGrid>
        {visible.map((p) => (
          <div key={p.shape} className="relative">
            <CatalogItemCard type="button"
              aria-label={`Add ${p.label}`}
              aria-pressed={active && shape === p.shape}
              onClick={() => {
                setFlushPlatePlacementShape(p.shape)
                useEditor.getState().setTool(WALL_FLUSH_PLATE)
              }} label={p.label}>
              <FlushPlatePreview shape={p.shape} />
            </CatalogItemCard>
            
          </div>
        ))}
      </CatalogGrid>
      {active && (
        <p role="status" className="text-[11px] text-muted-foreground">
          Click a wall to place. Esc to cancel.
        </p>
      )}
    </section>
  )
}
