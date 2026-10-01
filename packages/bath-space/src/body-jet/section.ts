import type { GeometryContext } from '@pascal-app/core'
import { BodyJetNode } from './schema'
import { buildBodyJetGeometry } from './geometry'
import { roundBodyJet } from './targets'
import { geometrySection } from '../section/geometry-section'
import { schemaDimensions, primaryDimension } from '../section/schema-dimensions'

export function bodyJetSection(n: BodyJetNode, context?: GeometryContext) {
  const dimensions = schemaDimensions(BodyJetNode.shape, n, [
    'width',
    ...(!roundBodyJet(n) ? ['height'] : []),
    'projection',
    'faceDepth',
    'pitch',
    'yaw',
    'jetCount',
    ...(n.jetCount > 1 ? ['groupSpacing'] : []),
    ...(n.flangeEnabled ? ['flangeSize', 'flangeThickness'] : []),
    ...(n.nozzlesEnabled ? ['nozzleSpacing', 'nozzleDiameter'] : []),
    'mountingHeight',
  ])
  const result = geometrySection(buildBodyJetGeometry(n, context), dimensions, {
    mountingHeight: n.mountingHeight,
  })
  result.dimensions = primaryDimension(dimensions, 'width', 'plan', 'x')
  return result
}
