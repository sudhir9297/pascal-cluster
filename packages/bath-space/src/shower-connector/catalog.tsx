'use client'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { SHOWER_CONNECTOR, showerConnectorPresets } from './schema'
import { useShowerConnectorPreset, setShowerConnectorPreset } from './placement-settings'
export default function ShowerConnectorCatalog({ query }: { query: string }) {
  const selected = useShowerConnectorPreset(),
    active = useEditor((s) => s.tool === SHOWER_CONNECTOR)
  return (
    <ShowerPresetCatalog
      title="Shower connectors and adapters"
      prefix="shower-connector"
      items={showerConnectorPresets}
      families={[
        {
          id: 'head',
          label: 'Shower head adapter',
          itemIds: showerConnectorPresets.filter((p) => !p.id.startsWith('hose-')).map((p) => p.id),
        },
        {
          id: 'hose',
          label: 'Shower hose adapter',
          itemIds: showerConnectorPresets.filter((p) => p.id.startsWith('hose-')).map((p) => p.id),
        },
      ]}
      query={query}
      selectedId={selected}
      active={active}
      onSelect={(id) => {
        setShowerConnectorPreset(id)
        useEditor.getState().setTool(SHOWER_CONNECTOR)
      }}
      hint="Click an overhead arm or its adapter. Existing heads are retained."
      renderPreview={(id) => (
        <svg
          viewBox="0 0 88 64"
          className="h-full w-full p-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          aria-hidden="true"
        >
          <path
            d={
              id.startsWith('elbow')
                ? 'M32 12V32Q32 46 48 46H62'
                : id === 'articulated'
                  ? 'M25 12L25 20L60 44L60 54'
                  : 'M44 12V52'
            }
          />
          <path d="M34 12H54" />
          {id === 'swivel' && <circle cx="44" cy="32" r="8" />}
        </svg>
      )}
    />
  )
}
