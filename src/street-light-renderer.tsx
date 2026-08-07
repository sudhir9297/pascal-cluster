'use client'

import {
  type AnyNodeId,
  useLiveNodeOverrides,
  useLiveTransforms,
  useRegistry,
  useScene,
} from '@pascal-app/core'
import { useNodeEvents } from '@pascal-app/viewer'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { resolveRoadAttachmentTransform } from './road-edge-attachments'
import { RoadNetworkNode, type StreetLightNode } from './schema'
import { StreetLightModel } from './street-light-model'

export default function StreetLightRenderer({ node: storeNode }: { node: StreetLightNode }) {
  const ref = useRef<Group>(null!)
  const handlers = useNodeEvents(storeNode as never, 'environment:street-light' as never)
  useRegistry(storeNode.id as AnyNodeId, storeNode.type, ref)

  const liveTransform = useLiveTransforms((s) => s.get(storeNode.id as AnyNodeId))
  const override = useLiveNodeOverrides(
    (s) => s.get(storeNode.id as AnyNodeId) as Partial<StreetLightNode> | undefined,
  )
  const node = override ? ({ ...storeNode, ...override } as StreetLightNode) : storeNode
  const sceneNodes = useScene((state) => state.nodes)
  const roadAttachmentTransform = useMemo(() => {
    const attachmentRef = node.roadAttachment
    if (!attachmentRef) return null
    const host = Object.values(sceneNodes).find(
      (candidate) => (candidate.id as string) === attachmentRef.networkNodeId,
    )
    if (!host || (host.type as string) !== 'environment:road-network') return null
    const road = RoadNetworkNode.parse(host)
    const attachment = road.attachments?.[attachmentRef.attachmentId]
    return attachment
      ? resolveRoadAttachmentTransform(road, attachment, node)
      : null
  }, [node, sceneNodes])
  const position = liveTransform?.position ?? roadAttachmentTransform?.position ?? node.position ?? [0, 0, 0]
  const baseRotation = node.rotation ?? [0, 0, 0]
  const rotation: [number, number, number] = liveTransform
    ? [baseRotation[0], liveTransform.rotation, baseRotation[2]]
    : roadAttachmentTransform?.rotation ?? baseRotation


  return (
    <group
      position={position}
      ref={ref}
      rotation={rotation}
      visible={node.visible !== false}
      {...handlers}
    >
      <StreetLightModel node={node} />
    </group>
  )
}
