'use client'

import { type AnyNodeId, useLiveNodeOverrides, useLiveTransforms, useRegistry, useScene } from '@pascal-app/core'
import { useNodeEvents } from '@pascal-app/viewer'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import type { StreetInfrastructureNode } from './street-infrastructure-config'
import { resolveRoadAttachmentTransform } from './road-edge-attachments'
import { RoadNetworkNode } from './schema'
import { StreetInfrastructureModel } from './street-infrastructure-model'

export default function StreetInfrastructureRenderer({
  node: storeNode,
}: {
  node: StreetInfrastructureNode
}) {
  const ref = useRef<Group>(null!)
  const handlers = useNodeEvents(storeNode as never, storeNode.type as never)
  useRegistry(storeNode.id as AnyNodeId, storeNode.type, ref)
  const liveTransform = useLiveTransforms((state) => state.get(storeNode.id as AnyNodeId))
  const override = useLiveNodeOverrides(
    (state) => state.get(storeNode.id as AnyNodeId) as Partial<StreetInfrastructureNode> | undefined,
  )
  const node = override
    ? ({ ...storeNode, ...override } as StreetInfrastructureNode)
    : storeNode
  const sceneNodes = useScene((state) => state.nodes)
  const attachmentRef = node.roadAttachment
  const roadAttachment = useMemo(() => {
    if (!attachmentRef) return null
    const host = Object.values(sceneNodes).find(
      (candidate) => (candidate.id as string) === attachmentRef.networkNodeId,
    )
    if (!host || (host.type as string) !== 'streetscape:road-network') return null
    const road = RoadNetworkNode.parse(host)
    const attachment = road.attachments?.[attachmentRef.attachmentId]
    const transform = attachment
      ? resolveRoadAttachmentTransform(road, attachment, node)
      : null
    return { host: road, transform }
  }, [attachmentRef, node, sceneNodes])
  const roadAttachmentTransform = roadAttachment?.transform ?? null
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
      <StreetInfrastructureModel node={node} />
    </group>
  )
}
