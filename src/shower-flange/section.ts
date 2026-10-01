import type { GeometryContext } from '@pascal-app/core'
import { ShowerFlangeNode } from './schema'
import { buildShowerFlangeGeometry } from './geometry'
import { geometrySection } from '../section/geometry-section'
import { schemaDimensions, primaryDimension } from '../section/schema-dimensions'

export function showerFlangeSection(n: ShowerFlangeNode, context?: GeometryContext) {
  const dimensions = schemaDimensions(ShowerFlangeNode.shape, n, [
    'width',
    'depth',
    ...(n.style === 'soft-square' ? ['cornerRadius'] : []),
    'clearance',
  ])
  const result = geometrySection(buildShowerFlangeGeometry(n, context), dimensions)
  result.dimensions = primaryDimension(dimensions, 'depth', 'section', 'x')
  return result
}
