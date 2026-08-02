import { describe, expect, test } from 'bun:test'
import { Vector3 } from 'three'
import {
  buildCobraHeadHousingGeometry,
  buildCobraHeadLensGeometry,
  resolveCobraHeadLightLayout,
} from './cobra-head-light-geometry'
import { CobraHeadLightNode } from './schema'

describe('cobra-head luminaire proportions', () => {
  test('keeps the shell streamlined and the refractor integrated', () => {
    const layout = resolveCobraHeadLightLayout(CobraHeadLightNode.parse({}))
    const housing = buildCobraHeadHousingGeometry(layout)
    const lens = buildCobraHeadLensGeometry(layout)
    const housingSize = housing.boundingBox!.getSize(new Vector3())
    const lensSize = lens.boundingBox!.getSize(new Vector3())
    const lensDrop = housing.boundingBox!.min.y - lens.boundingBox!.min.y

    expect(housingSize.x / housingSize.y).toBeGreaterThan(4)
    expect(layout.fixtureStartX - layout.armLength).toBeLessThanOrEqual(0.12)
    expect(lensSize.y).toBeLessThan(0.09)
    expect(lensDrop).toBeGreaterThan(0.025)
    expect(lensDrop).toBeLessThan(0.075)

    housing.dispose()
    lens.dispose()
  })
})
