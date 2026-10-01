'use client'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { SHOWER_VALVE, showerValvePresets } from './schema'
import { setShowerValvePreset, useShowerValvePreset } from './placement-settings'
export default function ShowerValveCatalog({ query }: { query: string }) {
  const selected = useShowerValvePreset(),
    active = useEditor((s) => s.tool === SHOWER_VALVE)
  return (
    <ShowerPresetCatalog
      title="Concealed valve"
      prefix="shower-valve"
      items={showerValvePresets}
      families={(
        ['pressure-balance', 'thermostatic', 'transfer', 'stop', 'universal'] as const
      ).map((family) => ({
        id: family,
        label: {
          'pressure-balance': 'Pressure-balancing valve',
          thermostatic: 'Thermostatic valve',
          transfer: 'Transfer valve',
          stop: 'Stop valve',
          universal: 'Installation box',
        }[family],
        itemIds: showerValvePresets.filter((p) => p.family === family).map((p) => p.id),
      }))}
      query={query}
      selectedId={selected}
      active={active}
      onSelect={(id) => {
        setShowerValvePreset(id)
        useEditor.getState().setTool(SHOWER_VALVE)
      }}
      hint="Click compatible concealed trim to attach."
      renderPreview={(id) => (
        <svg
          viewBox="0 0 88 64"
          className="h-full w-full p-2"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M20 32h48M44 12v40" />
          <rect
            x="30"
            y={id === 'thermostatic' ? 12 : 22}
            width="28"
            height={id === 'thermostatic' ? 40 : 20}
            rx="4"
          />
          <circle cx="44" cy="32" r="8" />
          {id === 'universal' && <rect x="24" y="12" width="40" height="40" rx="8" />}
        </svg>
      )}
    />
  )
}
