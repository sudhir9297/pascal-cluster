import type { GeometryContext } from '@pascal-app/core'
import { BathDeckNode } from './schema'
import { buildBathDeckGeometry } from './geometry'
import { deckMaximumThickness, deckMinimumDimensions } from './fit'
import { geometrySection } from '../section/geometry-section'
import { primaryDimension, schemaDimensions } from '../section/schema-dimensions'

export function bathDeckSection(node: BathDeckNode, context?: GeometryContext) {
  const minimum = deckMinimumDimensions(node, context?.children ?? [])
  let dimensions = schemaDimensions(BathDeckNode.shape, node, [
    'length',
    'width',
    'height',
    'thickness',
  ])
  dimensions = dimensions.map((field) => ({
    ...field,
    min: field.key in minimum ? minimum[field.key as keyof typeof minimum] : field.min,
    max:
      field.key === 'thickness' ? deckMaximumThickness(node, context?.children ?? []) : field.max,
  }))
  dimensions = primaryDimension(dimensions, 'length', 'plan', 'x')
  dimensions = primaryDimension(dimensions, 'width', 'plan', 'y')
  dimensions = primaryDimension(dimensions, 'height', 'section', 'y')
  return geometrySection(buildBathDeckGeometry(node, context), dimensions)
}
