import { BathScreenNode } from './schema'
import { buildBathScreenGeometry } from './geometry'
import { geometrySection } from '../section/geometry-section'
import { primaryDimension, schemaDimensions } from '../section/schema-dimensions'

export function bathScreenSection(node: BathScreenNode) {
  let dimensions = schemaDimensions(BathScreenNode.shape, node, [
    'width',
    'height',
    'thickness',
    ...(node.profile === 'rounded' ? ['cornerRadius'] : []),
    'opening',
  ])
  dimensions = primaryDimension(dimensions, 'width', 'plan', 'x')
  dimensions = primaryDimension(dimensions, 'height', 'section', 'y')
  return geometrySection(buildBathScreenGeometry(node), dimensions)
}
