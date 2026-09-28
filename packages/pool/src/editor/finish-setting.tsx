'use client'

import { POOL_FINISHES, type PoolFinish } from '../design/pool-finishes'
import type { PoolNode } from '../core/schema'

const FINISH_THUMBNAILS: Record<PoolFinish, string> = {
  'clean-white-plaster': new URL('./assets/finishes/clean-white-plaster.webp', import.meta.url).href,
  'clean-pale-blue-plaster': new URL('./assets/finishes/clean-pale-blue-plaster.webp', import.meta.url).href,
  'white-plaster': new URL('./assets/finishes/white-plaster.webp', import.meta.url).href,
  'quartz-white': new URL('./assets/finishes/quartz-white.webp', import.meta.url).href,
  'quartz-blue-gray': new URL('./assets/finishes/quartz-blue-gray.webp', import.meta.url).href,
  'natural-pebble-aqua': new URL('./assets/finishes/natural-pebble-aqua.webp', import.meta.url).href,
  'natural-pebble-gray': new URL('./assets/finishes/natural-pebble-gray.webp', import.meta.url).href,
  'sand-plaster': new URL('./assets/finishes/sand-plaster.webp', import.meta.url).href,
  'sand-quartz': new URL('./assets/finishes/sand-quartz.webp', import.meta.url).href,
  'sandy-pebble': new URL('./assets/finishes/sandy-pebble.webp', import.meta.url).href,
  'golden-pebble': new URL('./assets/finishes/golden-pebble.webp', import.meta.url).href,
  'polished-aggregate-blue': new URL('./assets/finishes/polished-aggregate-blue.webp', import.meta.url).href,
  'glass-bead-aqua': new URL('./assets/finishes/glass-bead-aqua.webp', import.meta.url).href,
  'light-mosaic': new URL('./assets/finishes/light-mosaic.webp', import.meta.url).href,
  'blue-mosaic': new URL('./assets/finishes/blue-mosaic.webp', import.meta.url).href,
  'dark-mosaic': new URL('./assets/finishes/dark-mosaic.webp', import.meta.url).href,
}

function finishLabel(finish: PoolFinish) {
  return finish.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export function FinishSetting({ value, onChange }: { value: PoolFinish; onChange: (value: PoolFinish) => void }) {
  return <fieldset className="space-y-2 border-0 p-0">
    <legend className="text-xs text-foreground/70">Interior finish</legend>
    <div className="grid grid-cols-3 gap-1.5">
      {POOL_FINISHES.map((finish) => {
        const label = finishLabel(finish)
        return <button
          aria-label={label}
          aria-pressed={value === finish}
          className={`min-w-0 overflow-hidden rounded-md border text-left text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${value === finish ? 'border-primary ring-1 ring-primary/50' : 'border-border hover:border-foreground/40'}`}
          key={finish}
          onClick={() => onChange(finish)}
          title={label}
          type="button"
        >
          <img alt="" className="aspect-[3/2] w-full object-cover" height="64" src={FINISH_THUMBNAILS[finish]} width="96" />
          <span className="block min-h-9 px-1.5 py-1 text-foreground/80">{label}</span>
        </button>
      })}
    </div>
  </fieldset>
}

export function PoolFinishInspectorControl({ node, onUpdate }: { node: PoolNode; onUpdate: (patch: Partial<PoolNode>) => void }) {
  return <div className="px-3 py-2"><FinishSetting value={node.interiorFinish} onChange={(interiorFinish) => onUpdate({ interiorFinish })} /></div>
}
