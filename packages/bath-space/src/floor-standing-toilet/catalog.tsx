'use client'
import { useEditor } from '@pascal-app/editor'
import { CatalogEmptyState } from '../catalog-ui'
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
  'back-to-wall': new URL('./assets/back-to-wall.png', import.meta.url).href,
  'compact-back-to-wall': new URL('./assets/compact-back-to-wall.png', import.meta.url).href,
  'square-back-to-wall': new URL('./assets/square-back-to-wall.png', import.meta.url).href,
  'close-coupled': new URL('./assets/close-coupled.png', import.meta.url).href,
  'one-piece': new URL('./assets/one-piece.png', import.meta.url).href,
  'traditional': new URL('./assets/traditional.png', import.meta.url).href,
  'two-piece-round': new URL('./assets/two-piece-round.png', import.meta.url).href,
  'two-piece-elongated': new URL('./assets/two-piece-elongated.png', import.meta.url).href,
  'two-piece-skirted': new URL('./assets/two-piece-skirted.png', import.meta.url).href,
  'two-piece-classic': new URL('./assets/two-piece-classic.png', import.meta.url).href,
  'one-piece-compact': new URL('./assets/one-piece-compact.png', import.meta.url).href,
  'one-piece-low-profile': new URL('./assets/one-piece-low-profile.png', import.meta.url).href,
  'one-piece-square': new URL('./assets/one-piece-square.png', import.meta.url).href,
  'one-piece-sculpted': new URL('./assets/one-piece-sculpted.png', import.meta.url).href,
}

export function ToiletPreview({
  design = 'back-to-wall',
}: {
  design?: FloorStandingToiletNode['design']
}) {
  return <img src={toiletThumbnails[design]} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
}

export default function ToiletCatalog({
  query,



}: {
  query: string

}) {
  const style = useToiletPlacementStyle(),
    active = useEditor((s) => s.tool === FLOOR_STANDING_TOILET)
  const visible = toiletPresets.filter(
    (p) =>
      `floor standing toilet ${p.label} concealed external tank cistern`
        .toLowerCase()
        .replaceAll('-', ' ')
        .includes(query.trim().toLowerCase().replaceAll('-', ' ')),
  )
  return (
    <section className="space-y-2 border-t border-border/60 pt-3">
      <h3 className="text-xs font-semibold">Floor standing toilets</h3>
      <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} >
        {visible.map((p) => (
          <div key={p.design} className="relative group">
            <button
              type="button"
              aria-label={`Add ${p.label} floor standing toilet`}
              aria-pressed={active && style === p.design}
              onClick={() => {
                setToiletPlacementStyle(p.design)
                useEditor.getState().setTool(FLOOR_STANDING_TOILET)
              }}
              className={`w-full overflow-hidden rounded-lg border text-left ${active && style === p.design ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/30'}`}
            >
              <span className="flex aspect-[7/4] items-center justify-center bg-background/40">
                <ToiletPreview design={p.design} />
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
