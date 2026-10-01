'use client'
import { useMemo } from 'react'
import WallFixtureTool from '../shower-common/wall-tool'
import { BodyJetNode, bodyJetPresets, bodyJetPresetNode } from './schema'
import { buildBodyJetGeometry } from './geometry'
import { useBodyJetPreset } from './placement-settings'
export default function BodyJetTool({ node }: { node?: BodyJetNode }) {
  const preset = useBodyJetPreset(),
    defaults = useMemo(
      () => bodyJetPresetNode(bodyJetPresets.find((p) => p.id === preset)!),
      [preset],
    )
  return (
    <WallFixtureTool
      node={node}
      schema={BodyJetNode}
      defaults={defaults}
      buildGeometry={buildBodyJetGeometry}
    />
  )
}
