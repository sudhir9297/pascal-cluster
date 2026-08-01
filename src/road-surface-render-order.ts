/**
 * Gives coplanar road surfaces a deterministic draw order. This lets the
 * strips form a natural plus/T union without depth-buffer flicker.
 */
export function roadSurfaceRenderOrder(nodeId: string): number {
  let hash = 2166136261
  for (let index = 0; index < nodeId.length; index += 1) {
    hash ^= nodeId.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return -1_000_000 + (hash >>> 0) % 999_999
}
