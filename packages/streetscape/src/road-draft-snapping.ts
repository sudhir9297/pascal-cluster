export type RoadPlanPoint = readonly [number, number]

/** Matches Pascal's directional drafting increment (15 degrees). */
export const ROAD_ANGLE_SNAP_STEP = Math.PI / 12

function snapScalar(value: number, step: number): number {
  if (step <= 0) return value
  return Math.round(value / step) * step
}

/**
 * Project a road endpoint onto the nearest host-style angle ray, then quantize
 * its distance along that ray. Quantizing the scalar distance (instead of the
 * resulting X/Z point) keeps non-axis legs exactly on their 15-degree ray.
 */
export function snapRoadPointAlongAngleRay(
  from: RoadPlanPoint,
  cursor: RoadPlanPoint,
  angleStep = ROAD_ANGLE_SNAP_STEP,
  distanceStep?: number,
): [number, number] {
  const dx = cursor[0] - from[0]
  const dz = cursor[1] - from[1]
  if (dx === 0 && dz === 0) return [from[0], from[1]]

  const angle = Math.atan2(dz, dx)
  const snappedAngle = angleStep > 0 ? Math.round(angle / angleStep) * angleStep : angle
  const directionX = Math.cos(snappedAngle)
  const directionZ = Math.sin(snappedAngle)
  const projectedDistance = dx * directionX + dz * directionZ
  const distance =
    distanceStep != null && distanceStep > 0
      ? snapScalar(projectedDistance, distanceStep)
      : projectedDistance

  return [from[0] + directionX * distance, from[1] + directionZ * distance]
}

export function roadLegAngleDegrees(from: RoadPlanPoint, to: RoadPlanPoint): number {
  const degrees = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI
  return ((degrees % 360) + 360) % 360
}
