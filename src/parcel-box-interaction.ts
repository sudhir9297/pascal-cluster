import { type AnyNodeId, useLiveNodeOverrides, useScene } from '@pascal-app/core'
import type { ParcelBoxNode } from './schema'

type ParcelBoxAnimation = { frame: number }

const activeAnimations = new Map<string, ParcelBoxAnimation>()

function parcelBoxNode(nodeId: AnyNodeId): ParcelBoxNode | null {
  const node = useScene.getState().nodes[nodeId] as unknown as ParcelBoxNode | undefined
  return node?.type === 'environment:parcel-box' ? node : null
}

function effectiveOperationState(nodeId: AnyNodeId): number {
  const node = parcelBoxNode(nodeId)
  if (!node) return 0
  const liveValue = useLiveNodeOverrides.getState().get(nodeId)?.operationState
  return typeof liveValue === 'number' ? liveValue : (node.operationState ?? 0)
}

/** Stop an in-flight parcel-box animation and commit its current visible pose. */
export function stopParcelBoxAnimation(nodeId: AnyNodeId) {
  const animation = activeAnimations.get(nodeId)
  if (!animation) return
  window.cancelAnimationFrame(animation.frame)
  activeAnimations.delete(nodeId)

  const operationState = effectiveOperationState(nodeId)
  if (parcelBoxNode(nodeId)) {
    useScene.getState().updateNode(nodeId, { operationState })
  }
  useLiveNodeOverrides.getState().clearFields(nodeId, ['operationState'])
}

/**
 * Animate the top lid and front access door without creating an undo entry
 * for every frame. Only the finished pose is written to the scene store.
 */
export function animateParcelBoxOperationState(nodeId: AnyNodeId, target: 0 | 1) {
  const existing = activeAnimations.get(nodeId)
  if (existing) {
    window.cancelAnimationFrame(existing.frame)
    activeAnimations.delete(nodeId)
  }

  if (!parcelBoxNode(nodeId)) return
  const start = effectiveOperationState(nodeId)
  if (Math.abs(start - target) < 1e-4) {
    useLiveNodeOverrides.getState().clearFields(nodeId, ['operationState'])
    useScene.getState().updateNode(nodeId, { operationState: target })
    return
  }

  const duration = 700
  const startTime = window.performance.now()
  const step = (time: number) => {
    const animation = activeAnimations.get(nodeId)
    if (!animation) return
    const t = Math.min(1, (time - startTime) / duration)
    const eased = 1 - (1 - t) ** 3
    const operationState = start + (target - start) * eased

    if (t < 1) {
      useLiveNodeOverrides.getState().set(nodeId, { operationState })
      animation.frame = window.requestAnimationFrame(step)
      return
    }

    activeAnimations.delete(nodeId)
    useScene.getState().updateNode(nodeId, { operationState: target })
    useLiveNodeOverrides.getState().clearFields(nodeId, ['operationState'])
  }

  activeAnimations.set(nodeId, { frame: window.requestAnimationFrame(step) })
}

/** E-key action. Pressing again mid-flight reverses from the live pose. */
export function toggleParcelBoxOperationState(nodeId: AnyNodeId) {
  if (!parcelBoxNode(nodeId)) return
  animateParcelBoxOperationState(nodeId, effectiveOperationState(nodeId) >= 0.5 ? 0 : 1)
}
