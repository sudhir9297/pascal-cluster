import { describe, expect, test } from 'bun:test'
import {
  ROAD_ANGLE_SNAP_STEP,
  roadLegAngleDegrees,
  snapRoadPointAlongAngleRay,
} from './road-draft-snapping'

describe('road angle-ray snapping', () => {
  test('locks the cursor to the nearest 15 degree host ray', () => {
    const radians = (14 * Math.PI) / 180
    const snapped = snapRoadPointAlongAngleRay(
      [2, -1],
      [2 + Math.cos(radians) * 8, -1 + Math.sin(radians) * 8],
    )

    expect(roadLegAngleDegrees([2, -1], snapped)).toBeCloseTo(15, 10)
  })

  test('quantizes distance along the ray without pulling the endpoint off-angle', () => {
    const snapped = snapRoadPointAlongAngleRay([0, 0], [4.73, 1.28], ROAD_ANGLE_SNAP_STEP, 0.25)
    const distance = Math.hypot(snapped[0], snapped[1])

    expect(roadLegAngleDegrees([0, 0], snapped)).toBeCloseTo(15, 10)
    expect(distance / 0.25).toBeCloseTo(Math.round(distance / 0.25), 10)
  })

  test('leaves a zero-length cursor at the ray origin', () => {
    expect(snapRoadPointAlongAngleRay([3, 7], [3, 7], ROAD_ANGLE_SNAP_STEP, 0.25)).toEqual([
      3, 7,
    ])
  })

  test('is stable when snapping an already-snapped endpoint again', () => {
    const once = snapRoadPointAlongAngleRay([0, 0], [5.2, -2.1], ROAD_ANGLE_SNAP_STEP, 0.25)
    expect(snapRoadPointAlongAngleRay([0, 0], once, ROAD_ANGLE_SNAP_STEP, 0.25)).toEqual(
      once,
    )
  })
})
