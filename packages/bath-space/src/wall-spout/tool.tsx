'use client'
import { useMemo } from 'react'
import WallFixtureTool from '../shower-common/wall-tool'
import { WallSpoutNode, wallSpoutPresets, wallSpoutPresetNode } from './schema'
import { buildWallSpoutGeometry } from './geometry'
import { useWallSpoutPreset } from './placement-settings'
export default function WallSpoutTool({ node }: { node?: WallSpoutNode }) {
  const preset = useWallSpoutPreset(),
    defaults = useMemo(
      () => wallSpoutPresetNode(wallSpoutPresets.find((p) => p.id === preset)!),
      [preset],
    )
  return (
    <WallFixtureTool
      node={node}
      schema={WallSpoutNode}
      defaults={defaults}
      buildGeometry={buildWallSpoutGeometry}
    />
  )
}
