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
import { MultiHeadAreaLightModel } from './multi-head-area-light-model'
import type { MultiHeadAreaLightNode } from './schema'

export default function MultiHeadAreaLightRenderer({
  node: storeNode,
}: {
  node: MultiHeadAreaLightNode
}) {
  const ref = useRef<Group>(null!)
  const handlers = useNodeEvents(
    storeNode as never,
    'environment:multi-head-area-light' as never,
  )
  useRegistry(storeNode.id as AnyNodeId, storeNode.type, ref)

  const liveTransform = useLiveTransforms((s) => s.get(storeNode.id as AnyNodeId))
  const override = useLiveNodeOverrides(
    (s) => s.get(storeNode.id as AnyNodeId) as Partial<MultiHeadAreaLightNode> | undefined,
  )
  const node = override ? ({ ...storeNode, ...override } as MultiHeadAreaLightNode) : storeNode
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
      <MultiHeadAreaLightModel node={node} />
    </group>
  )
}
