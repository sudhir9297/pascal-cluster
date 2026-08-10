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
import type { UtilityPoleNode, UtilityWireSpanNode } from './schema'
import { buildUtilityConductorCurves } from './utility-wire-geometry'

const NO_RAYCAST = () => {}

export default function UtilityWireRenderer({ node }: { node: UtilityWireSpanNode }) {
  const ref = useRef<Group>(null!)
  const handlers = useNodeEvents(node as never, 'streetscape:utility-wire-span' as never)
  useRegistry(node.id as AnyNodeId, node.type, ref)

  const fromStoreNode = useScene(
    (state) => state.nodes[node.fromPoleId as AnyNodeId] as unknown as UtilityPoleNode | undefined,
  )
  const toStoreNode = useScene(
    (state) => state.nodes[node.toPoleId as AnyNodeId] as unknown as UtilityPoleNode | undefined,
  )
  const fromLive = useLiveTransforms((state) => state.get(node.fromPoleId as AnyNodeId))
  const toLive = useLiveTransforms((state) => state.get(node.toPoleId as AnyNodeId))
  const fromOverride = useLiveNodeOverrides(
    (state) =>
      state.get(node.fromPoleId as AnyNodeId) as Partial<UtilityPoleNode> | undefined,
  )
  const toOverride = useLiveNodeOverrides(
    (state) => state.get(node.toPoleId as AnyNodeId) as Partial<UtilityPoleNode> | undefined,
  )

  const curves = useMemo(() => {
    if (!(fromStoreNode && toStoreNode)) return []
    const fromNode = fromOverride
      ? ({ ...fromStoreNode, ...fromOverride } as UtilityPoleNode)
      : fromStoreNode
    const toNode = toOverride
      ? ({ ...toStoreNode, ...toOverride } as UtilityPoleNode)
      : toStoreNode
    return buildUtilityConductorCurves(
      node,
      {
        node: fromNode,
        position: fromLive?.position ?? fromNode.position,
        rotationY: fromLive?.rotation ?? fromNode.rotation?.[1],
      },
      {
        node: toNode,
        position: toLive?.position ?? toNode.position,
        rotationY: toLive?.rotation ?? toNode.rotation?.[1],
      },
    )
  }, [node, fromStoreNode, toStoreNode, fromLive, toLive, fromOverride, toOverride])

  if (!(fromStoreNode && toStoreNode)) return null

  return (
    <group ref={ref} visible={node.visible !== false} {...handlers}>
      {curves.map(({ id, curve }) => (
        <mesh castShadow key={id} raycast={NO_RAYCAST}>
          <tubeGeometry args={[curve, 48, id === 'neutral' ? 0.011 : 0.014, 8, false]} />
          <meshStandardMaterial
            color={node.conductorColor}
            metalness={0.62}
            roughness={0.46}
          />
        </mesh>
      ))}
    </group>
  )
}
