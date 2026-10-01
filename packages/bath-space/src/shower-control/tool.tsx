'use client'
import { useMemo } from 'react'
import WallFixtureTool from '../shower-common/wall-tool'
import {
  ShowerControlNode,
  showerControlPresets,
  controlFootprint,
  controlPresetNode,
} from './schema'
import { buildShowerControlGeometry } from './geometry'
import { useShowerControlPreset } from './placement-settings'
export default function ShowerControlTool({ node }: { node?: ShowerControlNode }) {
  const id = useShowerControlPreset(),
    defaults = useMemo(() => {
      const p = showerControlPresets.find((p) => p.id === id)!,
        n = controlPresetNode(p)
      return { ...n, flangeSize: controlFootprint(n) }
    }, [id])
  return (
    <WallFixtureTool
      node={node}
      schema={ShowerControlNode}
      defaults={defaults}
      buildGeometry={buildShowerControlGeometry}
    />
  )
}
