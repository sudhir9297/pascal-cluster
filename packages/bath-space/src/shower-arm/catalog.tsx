'use client'
import { useEditor } from '@pascal-app/editor'
import { useShowerKitPreset } from '../shower-kit/placement-settings'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { ShowerArmNode, SHOWER_ARM, showerArmPresets } from './schema'
import { setShowerArmPlacementStyle, useShowerArmPlacementStyle } from './placement-settings'
export { ShowerArmShapePreview as ShowerArmPreview } from './preview'
import { ShowerArmShapePreview as ShowerArmPreview } from './preview'

export default function ShowerArmCatalog({ query }: { query: string }) {
  const kit = useShowerKitPreset()
  const style = useShowerArmPlacementStyle()
  const active = useEditor((s) => s.tool === SHOWER_ARM) && !kit
  return (
    <ShowerPresetCatalog
      title="Shower arm"
      prefix="shower-arm"
      items={showerArmPresets.map((p) => ({ id: p.style, label: p.label }))}
      query={query}
      selectedId={style}
      active={active}
      onSelect={(id) => {
        setShowerArmPlacementStyle(id as ShowerArmNode['style'])
        useEditor.getState().setTool(SHOWER_ARM)
      }}
      renderPreview={(id) => <ShowerArmPreview style={id as ShowerArmNode['style']} />}
      hint={'Click a wall to place.'}
    />
  )
}
