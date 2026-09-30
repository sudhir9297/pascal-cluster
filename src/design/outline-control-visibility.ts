import type { PoolPoint } from '../core/schema'

export const MAX_VISIBLE_OUTLINE_ANCHORS = 12

/** Select representative original anchors without simplifying the saved outline. */
export function visiblePoolOutlineAnchors(anchors: readonly PoolPoint[], showAll = false, focused: number | null = null): number[] {
  if (showAll || anchors.length <= MAX_VISIBLE_OUTLINE_ANCHORS) return anchors.map((_, index) => index)
  const selected = new Set([0])
  // Split the most significant remaining bend first. Collinear spans use their
  // midpoint so straight portions still have evenly distributed editing handles.
  while (selected.size < MAX_VISIBLE_OUTLINE_ANCHORS) {
    const indices = [...selected].sort((a, b) => a - b)
    let bestIndex = -1, bestScore = -1
    for (let span = 0; span < indices.length; span++) {
      const start = indices[span]!, end = indices[(span + 1) % indices.length]!
      const count = (end - start + anchors.length) % anchors.length || anchors.length
      const a = anchors[start]!, b = anchors[end]!
      const dx = b[0] - a[0], dz = b[1] - a[1], lengthSquared = dx * dx + dz * dz
      for (let offset = 1; offset < count; offset++) {
        const index = (start + offset) % anchors.length, point = anchors[index]!
        const t = lengthSquared ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / lengthSquared)) : 0
        const deviation = Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dz)
        const score = deviation + Math.min(offset, count - offset) * 1e-6
        if (score > bestScore) { bestScore = score; bestIndex = index }
      }
    }
    if (bestIndex < 0) break
    selected.add(bestIndex)
  }
  if (focused !== null && focused >= 0 && focused < anchors.length && !selected.has(focused)) {
    const nearest = [...selected].sort((a, b) => {
      const distance = (index: number) => Math.min(Math.abs(index - focused), anchors.length - Math.abs(index - focused))
      return distance(a) - distance(b)
    })[0]!
    selected.delete(nearest)
    selected.add(focused)
  }
  return [...selected].sort((a, b) => a - b)
}

export function poolOutlineInsertIndices(count: number, focused: number | null): number[] {
  return focused !== null && focused >= 0 && focused < count ? [(focused + count - 1) % count, focused] : []
}
