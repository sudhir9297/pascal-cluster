'use client'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { SHOWER_FLANGE, showerFlangePresets } from './schema'
import { useShowerFlangePreset, setShowerFlangePreset } from './placement-settings'
import roundPlateThumbnail from './assets/round-plate.webp'
import squarePlateThumbnail from './assets/square-plate.webp'
import softSquareThumbnail from './assets/soft-square.webp'
import raisedRoundThumbnail from './assets/raised-round.webp'
import steppedRoundThumbnail from './assets/stepped-round.webp'
import deepBellThumbnail from './assets/deep-bell.webp'
import widePlateThumbnail from './assets/wide-plate.webp'

type ThumbnailAsset = string | { src: string }
const thumbnailSrc = (asset: ThumbnailAsset | undefined) => typeof asset === 'string' ? asset : asset?.src

const showerFlangeThumbnails: Record<string, ThumbnailAsset> = {
  'round-plate': roundPlateThumbnail,
  'square-plate': squarePlateThumbnail,
  'soft-square': softSquareThumbnail,
  'raised-round': raisedRoundThumbnail,
  'stepped-round': steppedRoundThumbnail,
  'deep-bell': deepBellThumbnail,
  'wide-plate': widePlateThumbnail,
}
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
        <img src={thumbnailSrc(showerFlangeThumbnails[id])} alt="" className="h-full w-full object-contain p-1" />
      )}
    />
  )
}
