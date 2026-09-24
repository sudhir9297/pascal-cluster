import { describe, expect, test } from 'bun:test'
import { Vector3 } from 'three'
import { StreetLightNode } from './schema'
import {
  buildLampHousingGeometry,
  buildLampLensGeometry,
  resolveStreetLightLayout,
} from './street-light-geometry'

describe('roadway street-light geometry', () => {
  test('keeps the modern housing low-profile, wide, and integrated with its spigot', () => {
    const layout = resolveStreetLightLayout(StreetLightNode.parse({}))
    const housing = buildLampHousingGeometry(layout)
    const lens = buildLampLensGeometry(layout)
    const housingSize = housing.boundingBox!.getSize(new Vector3())
    const lensSize = lens.boundingBox!.getSize(new Vector3())
    const lensDrop = housing.boundingBox!.min.y - lens.boundingBox!.min.y

    expect(housingSize.x / housingSize.y).toBeGreaterThan(4)
    expect(housingSize.x / housingSize.z).toBeGreaterThan(2)
    expect(lensSize.x).toBeGreaterThan(housingSize.x * 0.5)
    expect(layout.fixtureStartX - 0.12).toBeLessThan(layout.armLength)
    expect(lensDrop).toBeGreaterThan(0)
    expect(lensDrop).toBeLessThan(0.03)

    housing.dispose()
    lens.dispose()
  })
})
