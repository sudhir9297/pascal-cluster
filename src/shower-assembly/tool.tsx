'use client'
import { fitAssemblyPlacement } from './placement'
import { useMemo } from 'react'
import WallFixtureTool from '../shower-common/wall-tool'
import { ShowerAssemblyNode, showerAssemblyPresets, assemblyPresetNode } from './schema'
import { useAssemblyPreset } from './placement-settings'
import { buildAssemblyPreview } from './geometry'
import { createAssemblyChanges } from './children'
export default function ShowerAssemblyTool({ node }: { node?: ShowerAssemblyNode }) {
  const preset = useAssemblyPreset(),
    defaults = useMemo(
      () => assemblyPresetNode(showerAssemblyPresets.find((p) => p.id === preset)!),
      [preset],
    )
  return (
    <WallFixtureTool
      node={node}
      defaults={defaults}
      schema={ShowerAssemblyNode}
      buildGeometry={buildAssemblyPreview}
      createChanges={createAssemblyChanges}
      filterPlacement={fitAssemblyPlacement}
    />
  )
}
