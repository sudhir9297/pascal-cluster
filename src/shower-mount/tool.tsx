'use client'
import { useMemo } from 'react'
import WallFixtureTool from '../shower-common/wall-tool'
import { ShowerMountNode, showerMountPresets } from './schema'
import { buildShowerMountGeometry } from './geometry'
import { useShowerMountStyle } from './placement-settings'
export default function ShowerMountTool({ node }: { node?: ShowerMountNode }) {
  const style = useShowerMountStyle(),
    defaults = useMemo(
      () =>
        ShowerMountNode.parse({
          style,
          name: showerMountPresets.find((p) => p.style === style)?.label,
        }),
      [style],
    )
  return (
    <WallFixtureTool
      node={node}
      schema={ShowerMountNode}
      defaults={defaults}
      buildGeometry={buildShowerMountGeometry}
    />
  )
}
