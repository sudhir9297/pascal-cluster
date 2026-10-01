import type { GeometryContext } from '@pascal-app/core'
import { ShowerControlNode } from './schema'
import { buildShowerControlGeometry } from './geometry'
import { exposedControl } from './schema'
import { geometrySection } from '../section/geometry-section'
import { schemaDimensions, primaryDimension } from '../section/schema-dimensions'

export function showerControlSection(n: ShowerControlNode, context?: GeometryContext) {
  const dimensions = schemaDimensions(ShowerControlNode.shape, n, [
    ...(exposedControl(n)
      ? ['bodyWidth', 'inletSpacing', 'projection', 'tubeSize']
      : [
          'plateWidth',
          ...(['rectangle', 'soft-rectangle'].includes(n.plateShape) ? ['plateHeight'] : []),
          ...(n.layout === 'dual' ? ['controlSpacing'] : []),
          ...(n.layout === 'buttons' ? ['buttonCount'] : []),
        ]),
    'handleDiameter',
    'handleLength',
    'handleProjection',
    'handleAngle',
    ...(n.layout !== 'single' ? ['secondaryAngle'] : []),
    'outletCount',
    'selectedOutlet',
    ...(n.flangeEnabled ? ['flangeThickness'] : []),
    ...(n.spoutEnabled
      ? [
          'spoutLength',
          'spoutDrop',
          'spoutRise',
          'spoutWidth',
          'spoutHeight',
          'spoutSlope',
          'spoutSwivel',
        ]
      : []),
    ...(exposedControl(n) && n.riserEnabled ? ['riserHeight'] : []),
    'mountingHeight',
  ])
  const result = geometrySection(buildShowerControlGeometry(n, context), dimensions, {
    mountingHeight: n.mountingHeight,
  })
  result.dimensions = primaryDimension(
    dimensions,
    exposedControl(n) ? 'bodyWidth' : 'plateWidth',
    'plan',
    'x',
  )
  return result
}
