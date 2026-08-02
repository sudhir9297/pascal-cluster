import { describe, expect, test } from 'bun:test'
import { Vector3 } from 'three'
import { TrussRoadwayLightNode } from './schema'
import {
  buildTrussRoadwayHousingGeometry,
  buildTrussRoadwayLensGeometry,
  resolveTrussRoadwayLightLayout,
} from './truss-roadway-light-geometry'

describe('truss roadway-light geometry', () => {
  test('forms a real rising pipe truss with an integrated full-cutoff head', () => {
    const layout = resolveTrussRoadwayLightLayout(TrussRoadwayLightNode.parse({}))
    const housing = buildTrussRoadwayHousingGeometry(layout)
    const lens = buildTrussRoadwayLensGeometry(layout)
    const housingSize = housing.boundingBox!.getSize(new Vector3())
    const lensSize = lens.boundingBox!.getSize(new Vector3())

    expect(layout.upperMountY - layout.lowerMountY).toBeCloseTo(layout.braceDepth)
    expect(layout.armY).toBeGreaterThan(layout.upperMountY)
    expect(layout.trussJointX).toBeGreaterThan(layout.armLength * 0.65)
    expect(layout.trussJointX).toBeLessThan(layout.armLength * 0.85)
    expect(layout.fixtureStartX - 0.1).toBeLessThan(layout.armLength)
    expect(housingSize.x / housingSize.y).toBeGreaterThan(4)
    expect(housingSize.x / housingSize.z).toBeGreaterThan(2)
    expect(lensSize.x).toBeGreaterThan(housingSize.x * 0.45)

    housing.dispose()
    lens.dispose()
  })
})
