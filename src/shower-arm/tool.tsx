'use client'
import { useMemo } from 'react'
import { useScene } from '@pascal-app/core'
import WallFixtureTool from '../shower-common/wall-tool'
import { ShowerArmNode, showerArmPresets } from './schema'
import { buildShowerArmGeometry } from './geometry'
import { useShowerArmPlacementStyle } from './placement-settings'
import {
  showerKitPresets,
  kitAnchor,
  createKitChanges,
  fitKitPlacement,
} from '../shower-kit/bundle'
import { buildKitPreview } from '../shower-kit/geometry'
import { useShowerKitPreset } from '../shower-kit/placement-settings'
export default function ShowerArmTool({ node }: { node?: ShowerArmNode }) {
  const style = useShowerArmPlacementStyle(),
    kitId = useShowerKitPreset()
  const kit = !node ? showerKitPresets.find((p) => p.id === kitId) : undefined
  const defaults = useMemo(
    () =>
      kit
        ? kitAnchor(kit)
        : ShowerArmNode.parse({
            ...showerArmPresets.find((p) => p.style === style),
            name: 'Shower arm',
          }),
    [style, kit],
  )
  const geometry = useMemo(
    () =>
      kit
        ? (n: ShowerArmNode, ctx?: Parameters<typeof buildShowerArmGeometry>[1]) =>
            buildKitPreview(kit, n, ctx)
        : buildShowerArmGeometry,
    [kit],
  )
  const create = useMemo(
    () =>
      kit ? (n: ShowerArmNode) => createKitChanges(kit, n, useScene.getState().nodes) : undefined,
    [kit],
  )
  const filter = useMemo(
    () =>
      kit
        ? (
            n: ShowerArmNode,
            pose: Parameters<typeof fitKitPlacement>[2],
            nodes: Parameters<typeof fitKitPlacement>[3],
          ) => fitKitPlacement(kit, n, pose, nodes)
        : undefined,
    [kit],
  )
  return (
    <WallFixtureTool
      node={node}
      schema={ShowerArmNode}
      defaults={defaults}
      buildGeometry={geometry}
      createChanges={create}
      filterPlacement={filter}
    />
  )
}
