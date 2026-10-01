import type { GeometryContext } from '@pascal-app/core'
import { ShowerAssemblyNode } from './schema'
import { buildAssemblyPreview } from './geometry'
import { geometrySection } from '../section/geometry-section'
import { schemaDimensions, primaryDimension } from '../section/schema-dimensions'

export function showerAssemblySection(n: ShowerAssemblyNode, context?: GeometryContext) {
  const dimensions = schemaDimensions(ShowerAssemblyNode.shape, n, [
    'height',
    ...(n.family === 'panel' ? ['width', 'depth'] : ['tubeSize']),
    'projection',
    'armLength',
    'holderSlide',
    'holderTilt',
    'holderOffset',
    ...(n.flangeEnabled ? ['flangeSize'] : []),
    'jets',
    ...(n.jets > 0 ? ['jetSize', 'jetTilt'] : []),
    'mountingHeight',
  ])
  const result = geometrySection(buildAssemblyPreview(n, context), dimensions, {
    mountingHeight: n.mountingHeight,
  })
  result.dimensions = primaryDimension(dimensions, 'height', 'section', 'y')
  return result
}
