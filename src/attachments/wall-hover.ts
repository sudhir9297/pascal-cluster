import type { WallEvent } from '@pascal-app/core'

export function createWallHoverHandlers<T extends { wallId: string }>(
  resolve: (event: WallEvent) => T | null,
  preview: (target: T | null) => void,
  current: () => T | null,
) {
  return {
    enterOrMove(event: WallEvent) {
      const target = resolve(event)
      if (!target) return
      // R3F may synchronously emit leave events while propagation is stopped.
      event.stopPropagation()
      preview(target)
    },
    leave(event: WallEvent) {
      if (current()?.wallId === event.node.id) preview(null)
    },
  }
}
