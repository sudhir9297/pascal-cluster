'use client'

import {
  type AnyNodeId,
  useLiveNodeOverrides,
  useLiveTransforms,
  useRegistry,
} from '@pascal-app/core'
import { useNodeEvents } from '@pascal-app/viewer'
import { useRef } from 'react'
import type { Group } from 'three'
import type { RoadSignNode } from './schema'
import { RoadSignModel } from './road-sign-model'

export default function RoadSignRenderer({ node: storeNode }: { node: RoadSignNode }) {
  const ref = useRef<Group>(null!)
  const handlers = useNodeEvents(storeNode as never, 'environment:road-sign' as never)
  useRegistry(storeNode.id as AnyNodeId, storeNode.type, ref)

  const liveTransform = useLiveTransforms((state) => state.get(storeNode.id as AnyNodeId))
  const override = useLiveNodeOverrides(
    (state) => state.get(storeNode.id as AnyNodeId) as Partial<RoadSignNode> | undefined,
  )
  const node = override ? ({ ...storeNode, ...override } as RoadSignNode) : storeNode
  const position = liveTransform?.position ?? node.position ?? [0, 0, 0]
  const baseRotation = node.rotation ?? [0, 0, 0]
  const rotation: [number, number, number] = liveTransform
    ? [baseRotation[0], liveTransform.rotation, baseRotation[2]]
    : baseRotation

  return (
    <group
      position={position}
      ref={ref}
      rotation={rotation}
      visible={node.visible !== false}
      {...handlers}
    >
      <RoadSignModel node={node} />
    </group>
  )
}
