import type { AnyNode } from '@pascal-app/core'
import { BATHTUB } from '../bathtub/schema'
import { SHOWER_ARM } from '../shower-arm/schema'
import { SHOWER_HEAD } from '../shower-head/schema'
import { SHOWER_CONTROL } from '../shower-control/schema'
import { SHOWER_ASSEMBLY, ShowerAssemblyNode } from '../shower-assembly/schema'
import { HAND_SHOWER } from '../hand-shower/schema'
import { SHOWER_HOSE } from '../shower-hose/schema'
import { SHOWER_DIVIDER } from '../shower-divider/schema'

export type BathingStep =
  | 'choice'
  | 'bath'
  | 'shower'
  | 'head'
  | 'control'
  | 'review'
  | 'divider'
  | 'complete'
export type BathingFlow = {
  step: BathingStep
  kind: 'shower' | 'bath' | 'both' | null
  system: 'kit' | 'assembly' | 'custom'
  bathId: string | null
  showerId: string | null
  controlId: string | null
  dividerIds: string[]
  dividerSkipped: boolean
}
export const bathingMetadataKey = 'bathSpaceBathingArea'
export const emptyBathingArea: BathingFlow = {
  step: 'choice',
  kind: null,
  system: 'kit',
  bathId: null,
  showerId: null,
  controlId: null,
  dividerIds: [],
  dividerSkipped: false,
}
export function readBathingArea(value: unknown): BathingFlow {
  if (!value || typeof value !== 'object')
    return { ...emptyBathingArea, dividerIds: [] }
  const flow = value as Partial<BathingFlow>
  if (
    ![
      'choice',
      'bath',
      'shower',
      'head',
      'control',
      'review',
      'divider',
      'complete',
    ].includes(flow.step ?? '')
  )
    return { ...emptyBathingArea, dividerIds: [] }
  return {
    step: flow.step!,
    kind: ['shower', 'bath', 'both'].includes(flow.kind ?? '')
      ? flow.kind!
      : null,
    system: ['kit', 'assembly', 'custom'].includes(flow.system ?? '')
      ? flow.system!
      : 'kit',
    bathId: typeof flow.bathId === 'string' ? flow.bathId : null,
    showerId: typeof flow.showerId === 'string' ? flow.showerId : null,
    controlId: typeof flow.controlId === 'string' ? flow.controlId : null,
    dividerIds: Array.isArray(flow.dividerIds)
      ? flow.dividerIds.filter((id): id is string => typeof id === 'string')
      : [],
    dividerSkipped: flow.dividerSkipped === true,
  }
}
const isType = (
  nodes: Readonly<Record<string, AnyNode>>,
  id: string | null,
  type: string,
) => Boolean(id && String(nodes[id]?.type) === type)
export function bathingHead(
  flow: BathingFlow,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  if (!flow.showerId) return undefined
  return Object.values(nodes).find((node) => {
    if (String(node.type) !== SHOWER_HEAD) return false
    let parent = node.parentId
    const seen = new Set<string>()
    while (parent && !seen.has(parent)) {
      if (parent === flow.showerId) return true
      seen.add(parent)
      parent = nodes[parent]?.parentId ?? null
    }
    return false
  })
}
export function bathingFixtures(
  flow: BathingFlow,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  const ids = new Set(
    [flow.bathId, flow.showerId, flow.controlId, ...flow.dividerIds].filter(
      (id): id is string => Boolean(id),
    ),
  )
  if (flow.showerId)
    for (const node of Object.values(nodes)) {
      const kit = node.metadata?.showerKit as { anchorId?: string } | undefined
      if (kit?.anchorId === flow.showerId || node.parentId === flow.showerId)
        ids.add(node.id)
    }
  return [...ids]
    .map((id) => nodes[id])
    .filter((node): node is AnyNode => Boolean(node))
}
export function bathingShowerReady(
  flow: BathingFlow,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  if (flow.system === 'custom')
    return (
      isType(nodes, flow.showerId, SHOWER_ARM) &&
      Boolean(bathingHead(flow, nodes)) &&
      isType(nodes, flow.controlId, SHOWER_CONTROL)
    )
  if (flow.system === 'assembly') {
    if (!isType(nodes, flow.showerId, SHOWER_ASSEMBLY)) return false
    const assembly = ShowerAssemblyNode.safeParse(nodes[flow.showerId!])
    if (!assembly.success) return false
    const parts = Object.values(nodes).filter(
      (node) => node.parentId === flow.showerId,
    )
    return (
      (!assembly.data.headEnabled ||
        parts.some((node) => String(node.type) === SHOWER_HEAD)) &&
      (!assembly.data.handEnabled ||
        parts.some((node) => String(node.type) === HAND_SHOWER)) &&
      (!assembly.data.handEnabled ||
        !assembly.data.hoseEnabled ||
        parts.some((node) => String(node.type) === SHOWER_HOSE))
    )
  }
  const anchor = flow.showerId ? nodes[flow.showerId] : undefined
  const kit = anchor?.metadata?.showerKit as
    | { included?: { id: string }[] }
    | undefined
  return (
    String(anchor?.type) === SHOWER_ARM &&
    Array.isArray(kit?.included) &&
    kit.included.length > 0 &&
    kit.included.every((part) => Boolean(nodes[part.id]))
  )
}
export function reconcileBathingArea(
  flow: BathingFlow,
  nodes: Readonly<Record<string, AnyNode>>,
): BathingFlow {
  if (!flow.kind) return { ...flow, step: 'choice' }
  if (flow.step === 'choice') return flow
  if (flow.kind !== 'shower' && !isType(nodes, flow.bathId, BATHTUB) && !['shower', 'head', 'control'].includes(flow.step))
    return { ...flow, step: 'bath', bathId: null }
  if (
    flow.kind !== 'bath' &&
    !['bath', 'shower'].includes(flow.step) &&
    !(flow.step === 'review' && isType(nodes, flow.bathId, BATHTUB)) &&
    !bathingShowerReady(flow, nodes)
  ) {
    if (flow.system !== 'custom' || !isType(nodes, flow.showerId, SHOWER_ARM))
      return { ...flow, step: 'shower' }
    if (flow.step === 'head') return flow
    if (!bathingHead(flow, nodes)) return { ...flow, step: 'head' }
    if (flow.step === 'control') return flow
    return { ...flow, step: 'control' }
  }
  const dividerIds = flow.dividerIds.filter((id) =>
    isType(nodes, id, SHOWER_DIVIDER),
  )
  return dividerIds.length !== flow.dividerIds.length
    ? {
        ...flow,
        dividerIds,
        step:
          flow.step === 'complete' && !dividerIds.length && !flow.dividerSkipped
            ? 'divider'
            : flow.step,
      }
    : flow
}
export function acceptBathingPlacement(
  flow: BathingFlow,
  node: AnyNode,
): BathingFlow | null {
  const type = String(node.type)
  if (flow.step === 'bath' && type === BATHTUB)
    return { ...flow, bathId: node.id }
  if (
    flow.step === 'shower' &&
    type === (flow.system === 'assembly' ? SHOWER_ASSEMBLY : SHOWER_ARM)
  ) {
    if (
      (flow.system === 'kit' && !node.metadata?.showerKit) ||
      (flow.system === 'custom' && node.metadata?.showerKit)
    )
      return null
    return {
      ...flow,
      showerId: node.id,
      controlId: null,
      step: flow.system === 'custom' ? 'head' : 'shower',
    }
  }
  if (flow.step === 'control' && type === SHOWER_CONTROL)
    return { ...flow, controlId: node.id, step: 'review' }
  return null
}
