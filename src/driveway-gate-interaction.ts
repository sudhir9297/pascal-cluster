import { type AnyNodeId, useLiveNodeOverrides, useScene } from '@pascal-app/core'
import type { ResidentialGateNode } from './schema'

type DrivewayGateAnimation = { frame: number; target: 0 | 1 }

const activeAnimations = new Map<string, DrivewayGateAnimation>()

function drivewayGateNode(nodeId: AnyNodeId): ResidentialGateNode | null {
  const node = useScene.getState().nodes[nodeId] as unknown as ResidentialGateNode | undefined
  return node?.type === 'streetscape:residential-gate' ? node : null
}

function effectiveOperationState(nodeId: AnyNodeId): number {
  const node = drivewayGateNode(nodeId)
  if (!node) return 0
  const liveValue = useLiveNodeOverrides.getState().get(nodeId)?.operationState
  return typeof liveValue === 'number' ? liveValue : (node.operationState ?? 0)
}

/** Stop an in-flight gate animation and commit its current visible pose. */
export function stopDrivewayGateAnimation(nodeId: AnyNodeId) {
  const animation = activeAnimations.get(nodeId)
  if (!animation) return
  window.cancelAnimationFrame(animation.frame)
  activeAnimations.delete(nodeId)

  const operationState = effectiveOperationState(nodeId)
  if (drivewayGateNode(nodeId)) {
    useScene.getState().updateNode(nodeId, { operationState })
  }
  useLiveNodeOverrides.getState().clearFields(nodeId, ['operationState'])
}

/** Animate both leaves while creating only one scene-store update at completion. */
export function animateDrivewayGateOperationState(nodeId: AnyNodeId, target: 0 | 1) {
  const existing = activeAnimations.get(nodeId)
  if (existing) {
    window.cancelAnimationFrame(existing.frame)
    activeAnimations.delete(nodeId)
  }

  if (!drivewayGateNode(nodeId)) return
  const start = effectiveOperationState(nodeId)
  if (Math.abs(start - target) < 1e-4) {
    useLiveNodeOverrides.getState().clearFields(nodeId, ['operationState'])
    useScene.getState().updateNode(nodeId, { operationState: target })
    return
  }

  const duration = 1050
  const startTime = window.performance.now()
  const step = (time: number) => {
    const animation = activeAnimations.get(nodeId)
    if (!animation) return
    const t = Math.min(1, (time - startTime) / duration)
    const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
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

  activeAnimations.set(nodeId, { frame: window.requestAnimationFrame(step), target })
}

/** E-key action. Pressing again mid-flight reverses from the live pose. */
export function toggleDrivewayGateOperationState(nodeId: AnyNodeId) {
  if (!drivewayGateNode(nodeId)) return
  const activeTarget = activeAnimations.get(nodeId)?.target
  const target = activeTarget === undefined
    ? effectiveOperationState(nodeId) >= 0.5 ? 0 : 1
    : activeTarget === 1 ? 0 : 1
  animateDrivewayGateOperationState(nodeId, target)
}
