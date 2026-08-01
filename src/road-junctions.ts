import type { RoadSplineNode } from './schema'

export const ROAD_JUNCTION_MARGIN = 0.08

export function getRoadJunctionRadius(width: number): number {
  return width / Math.sqrt(2) + ROAD_JUNCTION_MARGIN
}

/**
 * Junctions are formed by the overlapping road strips themselves. A separate
 * circular overlay makes T branches look like disks, so this remains an empty
 * compatibility seam while junction points continue to drive marking gaps.
 */
export function buildRoadJunctionGeometries(_node: RoadSplineNode): never[] {
  return []
}
