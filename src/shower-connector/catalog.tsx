'use client'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { SHOWER_CONNECTOR, showerConnectorPresets } from './schema'
import { useShowerConnectorPreset, setShowerConnectorPreset } from './placement-settings'
import HoseCouplingThumbnail from './assets/hose-coupling.webp'
import HoseElbowThumbnail from './assets/hose-elbow.webp'
import CouplingThumbnail from './assets/coupling.webp'
import ExtensionThumbnail from './assets/extension.webp'
import Elbow45Thumbnail from './assets/elbow-45.webp'
import Elbow90Thumbnail from './assets/elbow-90.webp'
import SwivelThumbnail from './assets/swivel.webp'
import ArticulatedThumbnail from './assets/articulated.webp'
import ReducerThumbnail from './assets/reducer.webp'

type ThumbnailAsset = string | { src: string }
const thumbnailSrc = (asset: ThumbnailAsset | undefined) => typeof asset === 'string' ? asset : asset?.src
const connectorThumbnails: Record<string, ThumbnailAsset> = {
  'hose-coupling': HoseCouplingThumbnail,
  'hose-elbow': HoseElbowThumbnail,
  'coupling': CouplingThumbnail,
  'extension': ExtensionThumbnail,
  'elbow-45': Elbow45Thumbnail,
  'elbow-90': Elbow90Thumbnail,
  'swivel': SwivelThumbnail,
  'articulated': ArticulatedThumbnail,
  'reducer': ReducerThumbnail,
}
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
        <img src={thumbnailSrc(connectorThumbnails[id])} alt="" className="h-full w-full object-contain p-1" />
      )}
    />
  )
}
