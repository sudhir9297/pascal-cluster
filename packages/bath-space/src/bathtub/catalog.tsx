'use client'
import { useEditor } from '@pascal-app/editor'
import { CatalogEmptyState } from '../catalog-ui'
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
export default function BathCatalog({
  query,



}: {
  query: string

}) {
  const shape = useBathPlacementShape(),
    tool = useEditor((state) => state.tool)
  const items = bathtubPresets.filter(
    (p) =>
      `${p.label} ${p.description} freestanding wall bathtub`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  )
  return (
    <section className="pt-2">
      <div
        className="grid grid-cols-3 gap-2"
        style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} aria-label="Bath shapes"
      >
        {items.map((p) => (
          <div key={p.shape} className="relative">
            <button
              type="button"
              aria-label={`Add ${p.label}`}
              aria-pressed={tool === BATHTUB && shape === p.shape}
              onClick={() => {
                setBathPlacementShape(p.shape)
                useEditor.getState().setTool(BATHTUB)
              }}
              className={`w-full overflow-hidden rounded-lg border text-left ${tool === BATHTUB && shape === p.shape ? 'border-primary bg-accent/30' : 'border-border bg-secondary/40'}`}
            >
              <span className="flex aspect-[7/4] items-center justify-center">
                <BathPreview shape={p.shape} />
              </span>
              <span className="block min-h-8 px-2 py-1.5 text-[11px] font-medium leading-4">
                {p.label}
              </span>
            </button>
            
          </div>
        ))}
      </div>
      {!items.length && (
        <CatalogEmptyState>
          No baths match this search.
        </CatalogEmptyState>
      )}
      {tool === BATHTUB && <p role="status" className="mt-2 text-[11px] text-muted-foreground">Click the floor to place. Esc to cancel.</p>}
    </section>
  )
}
