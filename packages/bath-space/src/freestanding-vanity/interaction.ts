import { type AnyNode, type AnyNodeId, getEffectiveNode, useLiveNodeOverrides, useScene } from '@pascal-app/core'
import { VanityNode, isVanityKind } from './schema'
import { vanityParts, vanityPartOpening } from './layout'

type PartAnimation = { startedAt: number; from: number; target: 0 | 1 }
type OpeningAnimation = {
  parts: Map<string, PartAnimation>
  signature: string
  allTarget?: 0 | 1
}
const animations = new Map<AnyNodeId, OpeningAnimation>()
const openingFields = ['partOpenings'] as const
const signature = (node: VanityNode) => JSON.stringify(vanityParts(node))

function currentVanity(id: AnyNodeId) {
  const state = useScene.getState()
  const raw = state.nodes[id]
  return !state.readOnly && raw && isVanityKind(String(raw.type)) ? VanityNode.parse(getEffectiveNode(raw)) : null
}

export function toggleVanityOpening(nodeId: AnyNodeId, partId?: string): boolean {
  const node = currentVanity(nodeId)
  if (!node) return false
  const parts = vanityParts(node)
  const running = animations.get(nodeId)
  const now = performance.now()
  if (partId) {
    const part = parts.find((entry) => entry.id === partId)
    if (!part) return false
    const animation = running?.signature === signature(node) ? running
      : { parts: new Map<string, PartAnimation>(), signature: signature(node) }
    const previous = animation.parts.get(partId)
    const target = previous ? (previous.target === 1 ? 0 : 1) : vanityPartOpening(node, part) > 0.01 ? 0 : 1
    animation.allTarget = undefined
    animation.parts.set(partId, { startedAt: now, from: vanityPartOpening(node, part), target })
    animations.set(nodeId, animation)
  } else {
    if (!parts.length) return false
    const target = running?.allTarget !== undefined ? (running.allTarget === 1 ? 0 : 1)
      : parts.some((part) => vanityPartOpening(node, part) > 0.01) ? 0 : 1
    animations.set(nodeId, {
      signature: signature(node), allTarget: target,
      parts: new Map(parts.map((part) => [part.id, { startedAt: now, from: vanityPartOpening(node, part), target }])),
    })
  }
  return true
}

export function advanceVanityAnimations(time: number) {
  for (const [id, animation] of animations) {
    const node = currentVanity(id)
    if (!node || signature(node) !== animation.signature) {
      cancelVanityAnimation(id)
      continue
    }
    const partOpenings = { ...node.partOpenings }
    let finished = true
    for (const [part, entry] of animation.parts) {
      const progress = Math.min(1, Math.max(0, (time - entry.startedAt) / 360))
      const eased = progress * progress * (3 - 2 * progress)
      partOpenings[part] = entry.from + (entry.target - entry.from) * eased
      if (progress < 1) finished = false
    }
    if (!finished) useLiveNodeOverrides.getState().set(id, { partOpenings })
    else {
      animations.delete(id)
      const patch = animation.allTarget !== undefined
        ? { partOpenings: {}, drawerOpen: animation.allTarget, doorOpen: animation.allTarget * 90 }
        : { partOpenings }
      // Frame updates remain transient; each completed gesture is one undoable edit.
      useScene.getState().updateNode(id, patch as Partial<AnyNode>)
      useLiveNodeOverrides.getState().clearFields(id, openingFields)
    }
  }
}

export function cancelVanityAnimation(id: AnyNodeId) {
  animations.delete(id)
  useLiveNodeOverrides.getState().clearFields(id, openingFields)
}

export function clearVanityAnimations() {
  for (const id of animations.keys()) useLiveNodeOverrides.getState().clearFields(id, openingFields)
  animations.clear()
}
