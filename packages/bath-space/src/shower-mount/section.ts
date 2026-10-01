import type { GeometryContext } from '@pascal-app/core'
import { ShowerMountNode } from './schema'
import { buildShowerMountGeometry } from './geometry'
import { hasHolder, hasSupply, isRail } from './schema'
import { geometrySection } from '../section/geometry-section'
import { schemaDimensions, primaryDimension } from '../section/schema-dimensions'

export function showerMountSection(n: ShowerMountNode, context?: GeometryContext) {
  const dimensions = schemaDimensions(ShowerMountNode.shape, n, [
    'projection',
    'tubeSize',
    ...(hasHolder(n) ? ['holderDiameter', 'holderDepth', 'holderTilt'] : []),
    ...(hasSupply(n) ? ['outletLength'] : []),
    ...(isRail(n)
      ? [
          'railLength',
          'railBracketInset',
          'sliderPosition',
          ...(n.shelfEnabled ? ['shelfWidth', 'shelfDepth'] : []),
        ]
      : []),
    ...(n.flangeEnabled ? ['flangeSize', 'flangeThickness'] : []),
    'mountingHeight',
  ])
  const result = geometrySection(buildShowerMountGeometry(n, context), dimensions, {
    mountingHeight: n.mountingHeight,
  })
  result.dimensions = primaryDimension(dimensions, 'projection', 'plan', 'y')
  if (isRail(n))
    result.dimensions = primaryDimension(result.dimensions, 'railLength', 'section', 'y')
  return result
}
