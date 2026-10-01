import type { GeometryContext } from '@pascal-app/core'
import { ShowerConnectorNode } from './schema'
import { buildShowerConnectorGeometry } from './geometry'
import { geometrySection } from '../section/geometry-section'
import { schemaDimensions, primaryDimension } from '../section/schema-dimensions'

export function showerConnectorSection(n: ShowerConnectorNode, context?: GeometryContext) {
  const dimensions = schemaDimensions(ShowerConnectorNode.shape, n, [
    'length',
    'diameter',
    'inletDiameter',
    'outletDiameter',
    'collarLength',
    ...(['elbow', 'swivel', 'articulated'].includes(n.style) ? ['angle', 'azimuth'] : []),
  ])
  const result = geometrySection(buildShowerConnectorGeometry(n, context), dimensions)
  result.dimensions = primaryDimension(dimensions, 'length', 'section', 'y')
  return result
}
