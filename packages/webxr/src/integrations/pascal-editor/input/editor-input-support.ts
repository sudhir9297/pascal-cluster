import {
  type AnyNode, commitTerrainField, type HeightPatch, hasRegistry3DMoveTool,
  isDatumField, isMovable, nodeRegistry, pointInPolygon2D,
  runAsSingleSceneHistoryStep, type SiteNode, type TerrainField, useScene,
} from '@pascal-app/core'
import type { Ray } from 'three'

export const EDITOR_GRID_INPUT_NAME = 'editor-grid-input'

const BESPOKE_MOVE_KINDS = new Set([
  'duct-segment', 'duct-fitting', 'pipe-segment', 'pipe-fitting', 'lineset', 'liquid-line',
])

export function canDirectMoveNode(node: AnyNode): boolean {
  if (BESPOKE_MOVE_KINDS.has(node.type) || !hasRegistry3DMoveTool(node.type)) return false
  if (nodeRegistry.get(node.type)?.affordanceTools?.move) return true
  return isMovable(node)
}

export function getSpatialPointerId(nativeEvent: unknown): XRInputSource | null {
  if (!nativeEvent || typeof nativeEvent !== 'object') return null
  const source = (nativeEvent as { inputSource?: unknown }).inputSource
  return source && typeof source === 'object' ? source as XRInputSource : null
}

type SpatialCapture = {
  onMove: (ray: Ray) => void
  onRelease: () => void
  onCancel: () => void
}

const captures = new WeakMap<XRInputSource, SpatialCapture>()

/** Shared capture channel for XR controls hosted by the editor. */
export const spatialPointerInput = {
  capture(source: XRInputSource, capture: SpatialCapture): () => void {
    captures.set(source, capture)
    return () => { if (captures.get(source) === capture) captures.delete(source) }
  },
  move(source: XRInputSource, ray: Ray): boolean {
    const capture = captures.get(source)
    if (!capture) return false
    capture.onMove(ray)
    return true
  },
  release(source: XRInputSource): boolean {
    const capture = captures.get(source)
    if (!capture) return false
    captures.delete(source)
    capture.onRelease()
    return true
  },
  cancel(source: XRInputSource): boolean {
    const capture = captures.get(source)
    if (!capture) return false
    captures.delete(source)
    capture.onCancel()
    return true
  },
}

export function terrainPointInsideSite(site: Pick<SiteNode, 'polygon'>, x: number, z: number): boolean {
  const polygon = site.polygon?.points ?? []
  return polygon.length >= 3 && pointInPolygon2D([x, z], polygon, { includeBoundary: true })
}

export function clipTerrainPatchToSite(field: TerrainField, patch: HeightPatch, site: Pick<SiteNode, 'polygon'>): HeightPatch {
  let heights: Int16Array | null = null
  for (let row = 0; row < patch.rows; row += 1) {
    for (let col = 0; col < patch.cols; col += 1) {
      const fieldCol = patch.col0 + col
      const fieldRow = patch.row0 + row
      const x = field.origin[0] + fieldCol * field.spacing
      const z = field.origin[1] + fieldRow * field.spacing
      if (terrainPointInsideSite(site, x, z)) continue
      const patchIndex = row * patch.cols + col
      const previous = field.heights[fieldRow * field.cols + fieldCol] ?? 0
      if ((patch.heights[patchIndex] ?? 0) === previous) continue
      heights ??= patch.heights.slice()
      heights[patchIndex] = previous
    }
  }
  return heights ? { ...patch, heights } : patch
}

export function commitStroke(siteId: SiteNode['id'], field: TerrainField): void {
  runAsSingleSceneHistoryStep(useScene, () => {
    useScene.getState().updateNode(siteId, {
      terrain: isDatumField(field) ? undefined : commitTerrainField(field),
    })
  })
}
