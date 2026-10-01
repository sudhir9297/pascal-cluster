import type { GeometryContext } from '@pascal-app/core'
import { ShowerDividerNode } from './schema'
import { buildShowerDividerGeometry } from './geometry'
import { geometrySection } from '../section/geometry-section'
import { schemaDimensions, primaryDimension } from '../section/schema-dimensions'

export function showerDividerSection(n: ShowerDividerNode, context?: GeometryContext) {
  const dimensions = schemaDimensions(ShowerDividerNode.shape, n, [
    'width',
    'height',
    'columns',
    'rows',
    'frameWidth',
    'frameDepth',
    'barWidth',
    'glassThickness',
  ])
  const result = geometrySection(buildShowerDividerGeometry(n, context), dimensions)
  result.dimensions = primaryDimension(dimensions, 'width', 'plan', 'x')
  result.dimensions = primaryDimension(result.dimensions, 'height', 'section', 'y')
  return result
}
