'use client'

import { WATER_PRESETS, type WaterPreset } from '../shader/water-presets'
import type { PoolNode } from '../core/schema'

const WATER_PRESET_THUMBNAILS: Record<WaterPreset, string> = {
  'crystal-clear': new URL('./assets/water-presets/crystal-clear.webp', import.meta.url).href,
  'vivid-aqua': new URL('./assets/water-presets/vivid-aqua.webp', import.meta.url).href,
  'tropical-lagoon': new URL('./assets/water-presets/tropical-lagoon.webp', import.meta.url).href,
}

function presetLabel(preset: WaterPreset) {
  return preset.split('-').map((part) => part[0]!.toUpperCase() + part.slice(1)).join(' ')
}

export function WaterPresetSetting({
  value,
  onChange,
  sidebar = false,
}: {
  value: WaterPreset
  onChange: (value: WaterPreset) => void
  sidebar?: boolean
}) {
  const palette = sidebar
    ? { label: 'text-sidebar-foreground/70', border: 'border-sidebar-border', selected: 'border-primary ring-primary/50', idle: 'hover:border-sidebar-foreground/40', text: 'text-sidebar-foreground/80' }
    : { label: 'text-foreground/70', border: 'border-border', selected: 'border-primary ring-primary/50', idle: 'hover:border-foreground/40', text: 'text-foreground/80' }

  return <fieldset className="space-y-2 border-0 p-0">
    <legend className={`text-xs ${palette.label}`}>Water preset</legend>
    <div className="grid grid-cols-3 gap-1.5">
      {WATER_PRESETS.map((preset) => {
        const label = presetLabel(preset)
        return <button
          aria-label={label}
          aria-pressed={value === preset}
          className={`min-w-0 overflow-hidden rounded-md border text-left text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${palette.border} ${value === preset ? `${palette.selected} ring-1` : palette.idle}`}
          key={preset}
          onClick={() => onChange(preset)}
          title={label}
          type="button"
        >
          <img alt="" className="aspect-[3/2] w-full object-cover" height="64" src={WATER_PRESET_THUMBNAILS[preset]} width="96" />
          <span className={`block px-1.5 py-1.5 ${palette.text}`}>{label}</span>
        </button>
      })}
    </div>
  </fieldset>
}

export function PoolWaterPresetInspectorControl({ node, onUpdate }: { node: PoolNode; onUpdate: (patch: Partial<PoolNode>) => void }) {
  return <div className="px-3 py-2"><WaterPresetSetting value={node.waterPreset} onChange={(waterPreset) => onUpdate({ waterPreset })} /></div>
}
