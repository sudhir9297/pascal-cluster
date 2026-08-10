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
import { TwinArmMedianLightModel } from './twin-arm-median-light-model'
import type { TwinArmMedianLightNode } from './schema'

export default function TwinArmMedianLightRenderer({
  node: storeNode,
}: {
  node: TwinArmMedianLightNode
}) {
  const ref = useRef<Group>(null!)
  const handlers = useNodeEvents(
    storeNode as never,
    'streetscape:twin-arm-median-light' as never,
  )
  useRegistry(storeNode.id as AnyNodeId, storeNode.type, ref)

  const liveTransform = useLiveTransforms((s) => s.get(storeNode.id as AnyNodeId))
  const override = useLiveNodeOverrides(
    (s) => s.get(storeNode.id as AnyNodeId) as Partial<TwinArmMedianLightNode> | undefined,
  )
  const node = override ? ({ ...storeNode, ...override } as TwinArmMedianLightNode) : storeNode
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
      <TwinArmMedianLightModel node={node} />
    </group>
  )
}
