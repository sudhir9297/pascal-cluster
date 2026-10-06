'use client'
import { useCatalogPreferences } from '../shower-common/catalog-preferences'
import { useEditor } from '@pascal-app/editor'
import { CatalogEmptyState, CatalogGrid, CatalogHeading, CatalogItemCard } from '../catalog-ui'
import { BATHTUB, bathtubPresets } from './schema'
import { bathThumbnails } from './thumbnails'
import {
  setBathPlacementShape,
  useBathPlacementShape,
} from './placement-settings'
export function BathPreview({ shape = 'oval' }: { shape?: string }) {
  return (
    <img
      alt=""
      src={bathThumbnails[shape as keyof typeof bathThumbnails] ?? bathThumbnails.oval}
      loading="lazy"
      className="h-full w-full object-contain p-1"
    />
  )
}
export default function BathCatalog({ query }: { query: string }) {
  const preferences = useCatalogPreferences()

  const key = (id: string) => `bath:${id}`
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const shape = useBathPlacementShape(),
    tool = useEditor((state) => state.tool)
  const items = bathtubPresets.filter(p =>
    words.every(word => `${p.label} ${p.description} bath bathtub`.toLowerCase().includes(word)))
  return (
    <section className="space-y-2 border-t border-border/60 pt-3">

      <CatalogHeading count={items.length}>Baths</CatalogHeading>
      <CatalogGrid aria-label="Bath shapes">
        {items.map((p) => (
          <div key={p.shape} className="relative">
            <CatalogItemCard type="button"
              aria-label={`Add ${p.label}`}
              aria-pressed={tool === BATHTUB && shape === p.shape}
              onClick={() => {
                preferences.remember(key(p.shape))
                setBathPlacementShape(p.shape)
                useEditor.getState().setTool(BATHTUB)
              }} label={p.label}>
              <BathPreview shape={p.shape} />
            </CatalogItemCard>

          </div>
        ))}
      </CatalogGrid>
      {!items.length && (
        <CatalogEmptyState>
          {'No baths match this search.'}
        </CatalogEmptyState>
      )}
      {tool === BATHTUB && <p role="status" className="mt-2 text-[11px] text-muted-foreground">Click the floor to place. Esc to cancel.</p>}
    </section>
  )
}
