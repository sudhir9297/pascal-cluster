'use client'
import { useEditor } from '@pascal-app/editor'
import { useShowerKitPreset } from '../shower-kit/placement-settings'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { ShowerArmNode, SHOWER_ARM, showerArmPresets } from './schema'
import { setShowerArmPlacementStyle, useShowerArmPlacementStyle } from './placement-settings'
import roundAdjustableThumbnail from './assets/round-adjustable.webp'
import squareAdjustableThumbnail from './assets/square-adjustable.webp'
import roundCurvedThumbnail from './assets/round-curved.webp'
import roundGooseneckThumbnail from './assets/round-gooseneck.webp'

type ThumbnailAsset = string | { src: string }
const thumbnailSrc = (asset: ThumbnailAsset | undefined) => typeof asset === 'string' ? asset : asset?.src

const showerArmThumbnails: Partial<Record<ShowerArmNode['style'], ThumbnailAsset>> = {
  'round-adjustable': roundAdjustableThumbnail,
  'square-adjustable': squareAdjustableThumbnail,
  'round-curved': roundCurvedThumbnail,
  'round-gooseneck': roundGooseneckThumbnail,
}
export { ShowerArmShapePreview as ShowerArmPreview } from './preview'
import { ShowerArmShapePreview as ShowerArmPreview } from './preview'

export default function ShowerArmCatalog({ query }: { query: string }) {
  const kit = useShowerKitPreset()
  const style = useShowerArmPlacementStyle()
  const active = useEditor((s) => s.tool === SHOWER_ARM) && !kit
  return (
    <ShowerPresetCatalog
      title="Shower arms"
      prefix="shower-arm"

      items={showerArmPresets.map((p) => ({ id: p.style, label: p.label }))}
      query={query}
      selectedId={style}
      active={active}
      onSelect={(id) => {
        setShowerArmPlacementStyle(id as ShowerArmNode['style'])
        useEditor.getState().setTool(SHOWER_ARM)
      }}
      renderPreview={(id) => {
        const asset = showerArmThumbnails[id as ShowerArmNode['style']]
        return asset ? <img src={thumbnailSrc(asset)} alt="" className="h-full w-full object-contain p-1" />
          : <ShowerArmPreview style={id as ShowerArmNode['style']} />
      }}
      hint={'Click a wall to place.'}
    />
  )
}
