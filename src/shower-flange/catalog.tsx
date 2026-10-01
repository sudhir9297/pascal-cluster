'use client'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { SHOWER_FLANGE, showerFlangePresets } from './schema'
import { useShowerFlangePreset, setShowerFlangePreset } from './placement-settings'
export default function ShowerFlangeCatalog({ query }: { query: string }) {
  const selected = useShowerFlangePreset(),
    active = useEditor((s) => s.tool === SHOWER_FLANGE)
  return (
    <ShowerPresetCatalog
      title="Arm cover"
      prefix="shower-flange"
      items={showerFlangePresets}
      query={query}
      selectedId={selected}
      active={active}
      onSelect={(id) => {
        setShowerFlangePreset(id)
        useEditor.getState().setTool(SHOWER_FLANGE)
      }}
      hint="Click a wall-mounted arm to attach or replace its cover."
      renderPreview={(id) => (
        <svg
          viewBox="0 0 88 64"
          className="h-full w-full p-2"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {id.includes('square') ? (
            <rect x="22" y="10" width="44" height="44" rx={id === 'soft-square' ? 7 : 0} />
          ) : (
            <circle cx="44" cy="32" r={id === 'wide-plate' ? 26 : 22} />
          )}
          <circle cx="44" cy="32" r="8" />
          {['raised-round', 'stepped-round', 'deep-bell'].includes(id) && (
            <circle cx="44" cy="32" r="14" />
          )}
        </svg>
      )}
    />
  )
}
