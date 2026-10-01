import { buildShowerArmGeometry } from '../shower-arm/geometry'
import { geometrySection } from './geometry-section'
import { armOutletAngle, type ShowerArmNode } from '../shower-arm/schema'
import { sectionDimension as dim, sectionDetail as detail, type SectionModel } from './fields'

export function showerArmSection(node: ShowerArmNode): SectionModel {
  const dimensions = [
    dim('length', 'Projection from wall', node.length, 0.1, 1.2, 0.01, 'plan', 'y'),
    detail(
      'tubeSize',
      node.style.startsWith('square') ? 'Square tube width' : 'Tube diameter',
      node.tubeSize,
      0.015,
      0.06,
      0.001,
    ),
    detail('connectorLength', 'Outlet connector length', node.connectorLength, 0.005, 0.04, 0.001),
  ]
  if (armOutletAngle(node) > 0)
    dimensions.push(detail('drop', 'Outlet drop', node.drop, 0.04, 0.4, 0.005))
  if (node.style.endsWith('gooseneck'))
    dimensions.push(detail('rise', 'Arch rise', node.rise, 0.04, 0.4, 0.005))
  if (node.style.endsWith('curved'))
    dimensions.push(
      detail(
        'bendRadius',
        'Bend radius',
        node.bendRadius,
        0.02,
        Math.min(0.2, node.length * 0.8, node.drop),
        0.005,
      ),
    )
  if (!node.style.endsWith('curved') && !node.style.endsWith('gooseneck'))
    dimensions.push(detail('outletAngle', 'Outlet angle', armOutletAngle(node), 0, 90, 1, '°'))
  if (node.flangeEnabled)
    dimensions.push(
      detail('flangeSize', 'Flange size', node.flangeSize, 0.04, 0.15, 0.001),
      detail('flangeThickness', 'Flange thickness', node.flangeThickness, 0.003, 0.03, 0.001),
    )
  dimensions.push(
    detail(
      'mountingHeight',
      'Connection height from floor',
      node.mountingHeight,
      Math.min(0, node.mountingHeight),
      Math.max(4, node.mountingHeight + 1),
      0.01,
    ),
  )
  return geometrySection(buildShowerArmGeometry(node), dimensions, {
    mountingHeight: node.mountingHeight,
  })
}
