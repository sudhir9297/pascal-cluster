import type { GeometryContext } from '@pascal-app/core'
import { ShowerHoseNode } from './schema'
import { buildShowerHoseGeometry } from './geometry'
import { geometrySection } from '../section/geometry-section'
import { schemaDimensions } from '../section/schema-dimensions'

export function showerHoseSection(n: ShowerHoseNode, context?: GeometryContext) {
  const dimensions = schemaDimensions(ShowerHoseNode.shape, n, [
    'length',
    'diameter',
    'connectorLength',
    'bow',
    ...(n.style === 'smooth' ? [] : ['ribSpacing']),
  ])
  const result = geometrySection(buildShowerHoseGeometry(n, context), dimensions)
  result.dimensions = dimensions.map((field) =>
    field.key === 'length' ? { ...field, handle: false } : field,
  )
  return result
}
