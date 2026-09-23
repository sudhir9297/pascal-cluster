import { finishOptions } from '../rendering/finishes'
import type { PathwayNode } from './schema'

export const DEFAULT_PATHWAY_WIDTH = 1.2
export const STONE_WALKWAY_PRESET = {
  defaultWidth: 1.8,
  finish: 'laidStone',
  color: '#b5b7a5',
  thickness: 0.08,
  cornerStyle: 'square',
} as const

/** Changing the primary width resizes the selected connected item. */
export function derivePathwaySettings(next: PathwayNode, patch: Partial<PathwayNode>): Partial<PathwayNode> {
  return {
    ...(patch.finish ? { color: finishOptions[next.finish].color } : {}),
    ...(patch.defaultWidth !== undefined ? {
      edges: next.edges.map((edge) => ({ ...edge, width: next.defaultWidth })),
    } : {}),
  }
}

export function drawingWidth(defaults: Record<string, unknown> | undefined): number {
  // Legacy `width` tool state was copied from an arbitrary existing pathway.
  // Only carry forward the explicit drawing setting, otherwise use 1.2 m.
  const value = defaults?.defaultWidth
  return typeof value === 'number' && Number.isFinite(value) && value >= 0.3 && value <= 10
    ? value : DEFAULT_PATHWAY_WIDTH
}
