'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useCallback, useMemo } from 'react'
import { usePlacement } from './placement'
import {
  isStreetInfrastructureKind,
  parseStreetInfrastructure,
  type StreetInfrastructureNode,
} from './street-infrastructure-config'
import {
  createRoadAttachmentForPlacement,
  reanchorRoadAttachment,
  type RoadAttachmentAssetKind,
} from './road-edge-attachments'
import type { RoadNetworkNode } from './schema'
import {
  resolveDrainageInletLayout,
  resolveFireHydrantLayout,
  resolveManholeCoverLayout,
  resolveTrafficBollardLayout,
  resolveRoadBarrierLayout,
  resolveResidentialRoadAssetLayout,
} from './street-infrastructure-geometry'
import StreetInfrastructurePreview from './street-infrastructure-preview'
import { useStreetscapeStore } from './store'

function roadNetworksForLevel(levelId: string): RoadNetworkNode[] {
  const scene = useScene.getState()
  return Object.values(scene.nodes).filter(
    (candidate) =>
      (candidate.type as string) === 'streetscape:road-network' &&
      (candidate as { parentId?: string }).parentId === levelId,
  ) as unknown as RoadNetworkNode[]
}

function RoadAttachmentGuide({ node }: { node: StreetInfrastructureNode }) {
  const residential = node.type.startsWith('streetscape:') &&
    !['streetscape:traffic-signal', 'streetscape:drainage-inlet', 'streetscape:manhole-cover', 'streetscape:fire-hydrant', 'streetscape:traffic-bollard', 'streetscape:road-barrier'].includes(node.type)
  const residentialLayout = residential ? resolveResidentialRoadAssetLayout(node as never) : null
  const radius = residentialLayout
    ? Math.max(residentialLayout.footprintWidth, residentialLayout.footprintDepth) / 2
    : node.type === 'streetscape:manhole-cover'
    ? resolveManholeCoverLayout(node).frameRadius
    : node.type === 'streetscape:drainage-inlet'
      ? (() => {
          const layout = resolveDrainageInletLayout(node)
          return Math.max((layout.length + 0.16) / 2, (layout.width + 0.16) / 2)
        })()
      : node.type === 'streetscape:traffic-signal'
        ? 0.36
        : node.type === 'streetscape:traffic-bollard'
          ? resolveTrafficBollardLayout(node).baseRadius
          : node.type === 'streetscape:road-barrier'
            ? resolveRoadBarrierLayout(node).length / 2
        : resolveFireHydrantLayout(node as Extract<StreetInfrastructureNode, { type: 'streetscape:fire-hydrant' }>).padRadius
  const y = residentialLayout
    ? residentialLayout.height + 0.01
    : node.type === 'streetscape:manhole-cover'
    ? (() => {
        const layout = resolveManholeCoverLayout(node)
        return layout.treadY + layout.treadHeight / 2
      })()
    : node.type === 'streetscape:drainage-inlet'
      ? (() => {
          const layout = resolveDrainageInletLayout(node)
          return layout.barBottomY + layout.barHeight
        })()
    : node.type === 'streetscape:traffic-bollard'
      ? 0.02
      : node.type === 'streetscape:road-barrier'
        ? 0.02
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

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position, placementRotationY) => {
    if (!activeLevelId || !kind) return
    const node = parseStreetInfrastructure(kind, {
      parentId: activeLevelId,
      position,
      rotation: [0, 0, 0],
    })
    const roadNetworks = roadNetworksForLevel(activeLevelId)
    const attached = createRoadAttachmentForPlacement({
      assetNodeId: node.id,
      id: `${node.id}:road`,
      kind: kind as RoadAttachmentAssetKind,
      node,
      networks: roadNetworks,
      point: position,
    })
    const roadAlignedNode = attached
      ? {
          ...node,
          position: attached.transform.position,
          rotation: attached.transform.rotation,
          roadAttachment: {
            networkNodeId: attached.network.id,
            attachmentId: attached.attachment.id,
            side: attached.attachment.side,
          },
        }
      : node
    const finalNode = {
      ...roadAlignedNode,
      rotation: [
        roadAlignedNode.rotation[0],
        roadAlignedNode.rotation[1] + placementRotationY,
        roadAlignedNode.rotation[2],
      ],
    } as StreetInfrastructureNode
    const scene = useScene.getState()
    const finalAttachment = attached
      ? reanchorRoadAttachment(attached.network, attached.attachment, finalNode)
      : null
    scene.applyNodeChanges({
      update: finalAttachment && attached
        ? [{
            id: attached.network.id as AnyNodeId,
            data: {
              attachments: {
                ...attached.network.attachments,
                [finalAttachment.id]: finalAttachment,
              },
            } as Partial<AnyNode>,
          }]
        : undefined,
      create: [{ node: finalNode as unknown as AnyNode, parentId: activeLevelId as AnyNodeId }],
    })
    useViewer.getState().setSelection({ selectedIds: [finalNode.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
  }, { resolvePreview: resolveRoadPreview })

  if (!activeLevelId || !previewNode) return null
  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <StreetInfrastructurePreview node={previewNode} />
      <RoadAttachmentGuide node={previewNode} />
    </group>
  )
}
