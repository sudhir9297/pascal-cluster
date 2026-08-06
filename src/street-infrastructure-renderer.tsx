'use client'

import { type AnyNode, type AnyNodeId, useLiveNodeOverrides, useLiveTransforms, useRegistry, useScene } from '@pascal-app/core'
import { useNodeEvents } from '@pascal-app/viewer'
import { useEffect, useMemo, useRef } from 'react'
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
  const legacyAttachment = useMemo(() => {
    if (!attachmentRef) return null
    const host = Object.values(sceneNodes).find(
      (candidate) => (candidate.id as string) === attachmentRef.networkNodeId,
    )
    if (!host || (host.type as string) !== 'environment:road-network') return null
    const road = RoadNetworkNode.parse(host)
    const attachment = road.attachments?.[attachmentRef.attachmentId]
    const transform = attachment
      ? resolveRoadAttachmentTransform(road, attachment, node)
      : null
    return { host: road, transform }
  }, [attachmentRef, node, sceneNodes])
  useEffect(() => {
    if (!attachmentRef) return
    const data = {
      ...(legacyAttachment?.transform
        ? {
            position: legacyAttachment.transform.position,
            rotation: legacyAttachment.transform.rotation,
          }
        : null),
      roadAttachment: undefined,
    } as unknown as Partial<AnyNode>
    const updates = [{ id: storeNode.id as AnyNodeId, data }]
    if (legacyAttachment?.host.attachments?.[attachmentRef.attachmentId]) {
      const { [attachmentRef.attachmentId]: _released, ...attachments } =
        legacyAttachment.host.attachments
      updates.push({
        id: legacyAttachment.host.id as AnyNodeId,
        data: { attachments } as Partial<AnyNode>,
      })
    }
    useScene.getState().updateNodes(updates)
  }, [attachmentRef, legacyAttachment, storeNode.id])
  const roadAttachmentTransform = legacyAttachment?.transform ?? null
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
