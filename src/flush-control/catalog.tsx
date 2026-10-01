'use client'
import { useEditor } from '@pascal-app/editor'
import { flushPlatePresets, WALL_FLUSH_PLATE } from './schema'
import {
  setFlushPlatePlacementShape,
  useFlushPlatePlacementShape,
} from './placement-settings'
const flushPlateThumbnails: Record<string, string> = {
  'rectangle': new URL('./assets/rectangle.png', import.meta.url).href,
  'rounded': new URL('./assets/rounded.png', import.meta.url).href,
  'square': new URL('./assets/square.png', import.meta.url).href,
  'round': new URL('./assets/round.png', import.meta.url).href,
  'oval': new URL('./assets/oval.png', import.meta.url).href,
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
      <h3 className="text-xs font-semibold">Wall flush plate</h3>
      <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} >
        {visible.map((p) => (
          <div key={p.shape} className="relative">
            <button
              type="button"
              aria-label={`Add ${p.label}`}
              aria-pressed={active && shape === p.shape}
              onClick={() => {
                setFlushPlatePlacementShape(p.shape)
                useEditor.getState().setTool(WALL_FLUSH_PLATE)
              }}
              className={`w-full overflow-hidden rounded-lg border text-left ${active && shape === p.shape ? 'border-primary' : 'border-border hover:bg-accent'}`}
            >
              <span className="flex aspect-[7/4]">
                <FlushPlatePreview shape={p.shape} />
              </span>
              <span className="block min-h-8 px-2 py-1.5 text-[11px] font-medium leading-4">{p.label}</span>
            </button>
            
          </div>
        ))}
      </div>
      {active && (
        <p role="status" className="text-[11px] text-muted-foreground">
          Click a wall to place. Esc to cancel.
        </p>
      )}
    </section>
  )
}
