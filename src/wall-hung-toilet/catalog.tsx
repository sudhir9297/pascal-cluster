'use client'
import { useEditor } from '@pascal-app/editor'
import { CatalogEmptyState } from '../catalog-ui'
import { WallHungToiletNode, WALL_HUNG_TOILET, toiletPresets } from './schema'
import {
  setToiletPlacementStyle,
  useToiletPlacementStyle,
} from './placement-settings'
const toiletThumbnails: Record<WallHungToiletNode['style'], string> = {
  'rounded': new URL('./assets/rounded.png', import.meta.url).href,
  'd-shaped': new URL('./assets/d-shaped.png', import.meta.url).href,
  'square': new URL('./assets/square.png', import.meta.url).href,
  'compact': new URL('./assets/compact.png', import.meta.url).href,
  'elongated': new URL('./assets/elongated.png', import.meta.url).href,
}

export function ToiletPreview({
  style = 'd-shaped',
}: {
  style?: WallHungToiletNode['style']
}) {
  return <img src={toiletThumbnails[style]} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
}

export default function ToiletCatalog({
  query,



}: {
  query: string

}) {
  const style = useToiletPlacementStyle(),
    active = useEditor((s) => s.tool === WALL_HUNG_TOILET)
  const visible = toiletPresets.filter(
    (p) =>
      `wall hung toilet ${p.label} concealed external tank cistern`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  )
  return (
    <section className="space-y-2 border-t border-border/60 pt-3">
      <h3 className="text-xs font-semibold">Wall hung toilets</h3>
      <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} >
        {visible.map((p) => (
          <div key={p.style} className="relative group">
            <button
              type="button"
              aria-label={`Add ${p.label} wall hung toilet`}
              aria-pressed={active && style === p.style}
              onClick={() => {
                setToiletPlacementStyle(p.style)
                useEditor.getState().setTool(WALL_HUNG_TOILET)
              }}
              className={`w-full overflow-hidden rounded-lg border text-left ${active && style === p.style ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/30'}`}
            >
              <span className="flex aspect-[7/4] items-center justify-center bg-background/40">
                <ToiletPreview style={p.style} />
              </span>
              <span className="block min-h-8 px-2 py-1.5 text-[11px] font-medium leading-4">{p.label}</span>
            </button>
            
          </div>
        ))}
      </div>
      {!visible.length && (
        <CatalogEmptyState>
          No matching items.
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
