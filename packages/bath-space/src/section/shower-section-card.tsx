'use client'
import { useMemo } from 'react'
import {
  getEffectiveNode,
  useScene,
  type AnyNode,
  type AnyNodeId,
  type GeometryContext,
} from '@pascal-app/core'
import { SectionAccordion } from './section-card'
import type { SectionModel } from './fields'

export function ShowerSectionAccordion<
  T extends { id: string; parentId?: string | null; children?: string[] },
>({
  node,
  model,
  onChange,
}: {
  node: T
  model: (node: T, context?: GeometryContext) => SectionModel
  onChange: (patch: Partial<T>) => void
}) {
  const nodes = useScene((state) => state.nodes)
  const contextualModel = useMemo(() => {
    const resolve: GeometryContext['resolve'] = <N = AnyNode>(id: AnyNodeId) => {
      const raw = nodes[id]
      return raw ? (getEffectiveNode(raw) as N) : undefined
    }
    const context: GeometryContext = {
      resolve,
      parent: node.parentId ? (resolve(node.parentId as AnyNodeId) ?? null) : null,
      children: (node.children ?? []).flatMap((id) => {
        const child = resolve(id as AnyNodeId)
        return child ? [child] : []
      }),
      siblings: [],
    }
    return (value: T) => model(value, context)
  }, [model, nodes, node.parentId, node.children])
  const preparePreview = (patch: Partial<T>): Partial<T> => {
    const next = { ...node, ...patch }
    if (
      'wallId' in next &&
      next.wallId &&
      'mountingHeight' in next &&
      typeof next.mountingHeight === 'number' &&
      'position' in next &&
      Array.isArray(next.position)
    ) {
      return {
        ...patch,
        position: [next.position[0], next.mountingHeight, next.position[2]],
      } as Partial<T>
    }
    return patch
  }
  return (
    <SectionAccordion
      node={node}
      model={contextualModel}
      onChange={onChange}
      preparePreview={preparePreview}
    />
  )
}
