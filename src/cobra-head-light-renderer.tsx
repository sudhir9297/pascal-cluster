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
import { CobraHeadLightModel } from './cobra-head-light-model'
import type { CobraHeadLightNode } from './schema'

export default function CobraHeadLightRenderer({
  node: storeNode,
}: {
  node: CobraHeadLightNode
}) {
  const ref = useRef<Group>(null!)
  const handlers = useNodeEvents(storeNode as never, 'streetscape:cobra-head-light' as never)
  useRegistry(storeNode.id as AnyNodeId, storeNode.type, ref)

  const liveTransform = useLiveTransforms((s) => s.get(storeNode.id as AnyNodeId))
  const override = useLiveNodeOverrides(
    (s) => s.get(storeNode.id as AnyNodeId) as Partial<CobraHeadLightNode> | undefined,
  )
  const node = override ? ({ ...storeNode, ...override } as CobraHeadLightNode) : storeNode
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
      <CobraHeadLightModel node={node} />
    </group>
  )
}
