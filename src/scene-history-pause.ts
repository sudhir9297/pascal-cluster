import { useScene } from '@pascal-app/core'

const leases = new Set<symbol>()

export function acquireRoadHistoryPause(): () => void {
  if (leases.size === 0) useScene.temporal.getState().pause()
  const lease = Symbol('road-history-pause')
  leases.add(lease)
  return () => {
    if (!leases.delete(lease)) return
    if (leases.size === 0) useScene.temporal.getState().resume()
  }
}
