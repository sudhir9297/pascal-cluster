'use client'
import { useEditor } from '@pascal-app/editor'
import { SHOWER_ARM } from '../shower-arm/schema'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { showerKitPresets } from './bundle'
import { setShowerKitPreset, useShowerKitPreset } from './placement-settings'
import RoundRailKitThumbnail from './assets/round-rail-kit.webp'
import SquareRailKitThumbnail from './assets/square-rail-kit.webp'
import CompactKitThumbnail from './assets/compact-kit.webp'
import BathShowerKitThumbnail from './assets/bath-shower-kit.webp'

type ThumbnailAsset = string | { src: string }
const thumbnailSrc = (asset: ThumbnailAsset | undefined) => typeof asset === 'string' ? asset : asset?.src
const showerKitThumbnails: Record<string, ThumbnailAsset> = {
  'round-rail-kit': RoundRailKitThumbnail,
  'square-rail-kit': SquareRailKitThumbnail,
  'compact-kit': CompactKitThumbnail,
  'bath-shower-kit': BathShowerKitThumbnail,
}
export default function ShowerKitCatalog({ query }: { query: string }) {
  const selected = useShowerKitPreset(),
    active = useEditor((s) => s.tool === SHOWER_ARM)
  return (
    <ShowerPresetCatalog
      title="Shower kits"
      prefix="shower-kit"
      items={showerKitPresets}

      query={query}
      selectedId={selected ?? ''}
      active={active && !!selected}
      onSelect={setSelected}
      hint="Click a wall to place."
      renderPreview={(id) => (
        <img src={thumbnailSrc(showerKitThumbnails[id])} alt="" className="h-full w-full object-contain p-1" />
      )}
    />
  )
}
function setSelected(id: string) {
  setShowerKitPreset(id)
  useEditor.getState().setTool(SHOWER_ARM)
}
