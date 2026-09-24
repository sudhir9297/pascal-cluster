import { describe, expect, test } from 'bun:test'
import { Vector3 } from 'three'
import { TwinArmMedianLightNode } from './schema'
import {
  buildTwinArmMedianHousingGeometry,
  buildTwinArmMedianLensGeometry,
  resolveTwinArmMedianLightLayout,
} from './twin-arm-median-light-geometry'

describe('twin-arm median luminaire proportions', () => {
  test('keeps a thin integrated roadway-head silhouette', () => {
    const layout = resolveTwinArmMedianLightLayout(TwinArmMedianLightNode.parse({}))
    const housing = buildTwinArmMedianHousingGeometry(layout)
    const lens = buildTwinArmMedianLensGeometry(layout)
    const housingSize = housing.boundingBox!.getSize(new Vector3())

    expect(housingSize.x / housingSize.y).toBeGreaterThan(8)
    expect(housingSize.z / housingSize.y).toBeGreaterThan(3.5)
    expect(layout.fixtureStartX - layout.armLength).toBeLessThanOrEqual(0.12)
    expect(lens.boundingBox!.min.y).toBeLessThan(housing.boundingBox!.min.y - 0.03)

    housing.dispose()
    lens.dispose()
  })
})
