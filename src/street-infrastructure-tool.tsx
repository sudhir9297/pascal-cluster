'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useCallback, useMemo } from 'react'
import { finishEnvironmentPlacement, usePlacement } from './placement'
import {
  isStreetInfrastructureKind,
  parseStreetInfrastructure,
  type StreetInfrastructureNode,
} from './street-infrastructure-config'
import {
  createRoadAttachmentForPlacement,
  resolveFreeRoadPlacement,
  type RoadAttachmentAssetKind,
} from './road-edge-attachments'
import type { RoadNetworkNode } from './schema'
import {
  resolveDrainageInletLayout,
  resolveFireHydrantLayout,
  resolveManholeCoverLayout,
} from './street-infrastructure-geometry'
import StreetInfrastructurePreview from './street-infrastructure-preview'
import { useEnvironmentStore } from './store'

function roadNetworksForLevel(levelId: string): RoadNetworkNode[] {
  const scene = useScene.getState()
  return Object.values(scene.nodes).filter(
    (candidate) =>
      (candidate.type as string) === 'environment:road-network' &&
      (candidate as { parentId?: string }).parentId === levelId,
  ) as unknown as RoadNetworkNode[]
}

function RoadAttachmentGuide({ node }: { node: StreetInfrastructureNode }) {
  const radius = node.type === 'environment:manhole-cover'
    ? resolveManholeCoverLayout(node).frameRadius
    : node.type === 'environment:drainage-inlet'
      ? (() => {
          const layout = resolveDrainageInletLayout(node)
          return Math.max((layout.length + 0.16) / 2, (layout.width + 0.16) / 2)
        })()
      : node.type === 'environment:traffic-signal'
        ? 0.36
        : resolveFireHydrantLayout(node).padRadius
  const y = node.type === 'environment:manhole-cover'
    ? (() => {
        const layout = resolveManholeCoverLayout(node)
        return layout.treadY + layout.treadHeight / 2
      })()
    : node.type === 'environment:drainage-inlet'
      ? (() => {
          const layout = resolveDrainageInletLayout(node)
          return layout.barBottomY + layout.barHeight
        })()
      : 0.018
  return (
    <mesh
      layers={EDITOR_LAYER}
      name="road-attachment-preview-guide"
      position={[0, y, 0]}
      raycast={() => undefined}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[radius, radius + 0.035, 32]} />
      <meshBasicMaterial
        color="#42d8ff"
        depthTest={false}
        depthWrite={false}
        opacity={0.82}
        transparent
      />
    </mesh>
  )
}

export default function StreetInfrastructureTool() {
  const activeLevelId = useViewer((state) => state.selection.levelId)
  const activeTool = useEditor((state) => state.tool as string)
  const kind = isStreetInfrastructureKind(activeTool) ? activeTool : null
  const previewNode = useMemo(
    () => kind
      ? parseStreetInfrastructure(kind, {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
        })
      : null,
    [kind],
  )
  const resolveRoadPreview = useCallback(
    (position: [number, number, number]) => {
      if (!activeLevelId || !kind || !previewNode) return null
      const attached = createRoadAttachmentForPlacement({
        assetNodeId: previewNode.id,
        id: `${previewNode.id}:road-preview`,
        kind: kind as RoadAttachmentAssetKind,
        node: previewNode,
        networks: roadNetworksForLevel(activeLevelId),
        point: position,
      })
      return attached?.transform ?? null
    },
    [activeLevelId, kind, previewNode],
  )

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position) => {
    if (!activeLevelId || !kind) return
    const node = parseStreetInfrastructure(kind, {
      parentId: activeLevelId,
      position,
      rotation: [0, 0, 0],
    })
    const roadNetworks = roadNetworksForLevel(activeLevelId)
    const attachmentId = `${node.id}:road`
    const finalNode = resolveFreeRoadPlacement({
      assetNodeId: node.id,
      id: attachmentId,
      kind: kind as RoadAttachmentAssetKind,
      node,
      networks: roadNetworks,
      point: position,
    })
    const scene = useScene.getState()
    scene.createNode(finalNode as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [finalNode.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
    finishEnvironmentPlacement(useEnvironmentStore.getState().placementMode)
  }, { resolvePreview: resolveRoadPreview })

  if (!activeLevelId || !previewNode) return null
  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <StreetInfrastructurePreview node={previewNode} />
      <RoadAttachmentGuide node={previewNode} />
    </group>
  )
}
