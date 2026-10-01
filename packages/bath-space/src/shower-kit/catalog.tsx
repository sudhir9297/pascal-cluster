'use client'
import { useEditor } from '@pascal-app/editor'
import { SHOWER_ARM } from '../shower-arm/schema'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { showerKitPresets } from './bundle'
import { setShowerKitPreset, useShowerKitPreset } from './placement-settings'
export default function ShowerKitCatalog({ query }: { query: string }) {
  const selected = useShowerKitPreset(),
    active = useEditor((s) => s.tool === SHOWER_ARM)
  return (
    <ShowerPresetCatalog
      title="Shower kits"
      prefix="shower-kit"
      items={showerKitPresets}
      consolidate={false}
      query={query}
      selectedId={selected ?? ''}
      active={active && !!selected}
      onSelect={setSelected}
      hint="Click a wall to place."
      renderPreview={(id) => {
        const p = showerKitPresets.find((n) => n.id === id)!
        return (
          <svg
            viewBox="0 0 88 64"
            className="h-full w-full p-2"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10 5v52M12 10h28v5M30 16h20M27 47h16M56 22v29M56 32h9M63 33v8M56 51c-5 12 14 12 9-9" />
            <path d={p.rail ? 'M56 20v32' : 'M53 32h7'} />
            {p.bath && <path d="M29 48v5h13" />}
          </svg>
        )
      }}
    />
  )
}
function setSelected(id: string) {
  setShowerKitPreset(id)
  useEditor.getState().setTool(SHOWER_ARM)
}
