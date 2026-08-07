const MAX_GATE_OPEN_ANGLE = Math.PI * 0.48

function clamp01(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Math.min(1, Math.max(0, numeric))
}

/** Resolve both swing leaves from the shared closed-to-open operation state. */
export function resolveDrivewayGateOpenPose(operationState: number) {
  const openProgress = clamp01(operationState)
  const angle = openProgress * MAX_GATE_OPEN_ANGLE
  return {
    leftLeafAngle: angle,
    openProgress,
    rightLeafAngle: -angle,
  }
}
