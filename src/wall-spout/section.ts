import type { GeometryContext } from '@pascal-app/core'
import { WallSpoutNode } from './schema'
import { buildWallSpoutGeometry } from './geometry'
import { waterfallSpout } from './schema'
import { geometrySection } from '../section/geometry-section'
import { schemaDimensions, primaryDimension } from '../section/schema-dimensions'

export function wallSpoutSection(n: WallSpoutNode, context?: GeometryContext) {
  const dimensions = schemaDimensions(WallSpoutNode.shape, n, [
    'length',
    ...(waterfallSpout(n)
      ? ['waterfallWidth', 'waterfallHeight', 'waterfallSlope']
      : ['tubeSize', 'drop', ...(n.style === 'round-arched' ? ['rise'] : []), ...(n.style === 'round-curved' ? ['bendRadius'] : [])]),
    ...(n.flangeEnabled ? ['flangeSize', 'flangeThickness'] : []),
    ...(n.diverterStyle !== 'none' ? ['diverterSize'] : []),
    ...(n.fixtureType === 'bib' ? [...(n.handleStyle !== 'knob' ? ['handleLength'] : []), 'handleAngle'] : []),
    'mountingHeight',
  ])
  const result = geometrySection(buildWallSpoutGeometry(n, context), dimensions, {
    mountingHeight: n.mountingHeight,
  })
  result.dimensions = primaryDimension(dimensions, 'length', 'plan', 'y')
  return result
}
