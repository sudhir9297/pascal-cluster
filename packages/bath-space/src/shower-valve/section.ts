import type { GeometryContext } from '@pascal-app/core'
import { ShowerValveNode } from './schema'
import { buildShowerValveGeometry } from './geometry'
import { geometrySection } from '../section/geometry-section'
import { schemaDimensions, primaryDimension } from '../section/schema-dimensions'

export function showerValveSection(n: ShowerValveNode, context?: GeometryContext) {
  const dimensions = schemaDimensions(ShowerValveNode.shape, n, [
    'width',
    'height',
    'mountingDepth',
    'portDiameter',
    'portLength',
    'outletCount',
  ])
  const result = geometrySection(buildShowerValveGeometry(n, context), dimensions)
  result.dimensions = primaryDimension(dimensions, 'mountingDepth', 'section', 'x')
  return result
}
