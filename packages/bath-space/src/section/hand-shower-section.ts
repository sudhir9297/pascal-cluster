import { buildHandShowerGeometry } from '../hand-shower/geometry'
import { geometrySection } from './geometry-section'
import type { HandShowerNode } from '../hand-shower/schema'
import { handShowerDimensions } from '../hand-shower/geometry'
import { sectionDimension as dim, sectionDetail as detail, type SectionModel } from './fields'
export function handShowerSection(n: HandShowerNode): SectionModel {
  const d = handShowerDimensions(n)
  const round = n.style === 'round' || n.style === 'oval'
  const dimensions = [
    dim(
      'handleLength',
      d.wand ? 'Wand length' : 'Handle length',
      n.handleLength,
      0.1,
      0.24,
      0.001,
      'section',
      'y',
    ),
    detail(
      'handleDiameter',
      n.style.startsWith('square') ? 'Grip width' : 'Grip diameter',
      n.handleDiameter,
      0.018,
      0.035,
      0.001,
    ),
    detail('gripInsertion', 'Handle below holder', n.gripInsertion, 0.01, 0.055, 0.001),
    detail('connectorLength', 'Connector length', n.connectorLength, 0.012, 0.035, 0.001),
  ]
  if (!d.wand) {
    dimensions.push(
      dim(
        'headWidth',
        round && n.style === 'round' ? 'Head diameter' : 'Head width',
        n.headWidth,
        0.055,
        0.16,
        0.001,
        'plan',
        'x',
      ),
      detail('headThickness', 'Head thickness', n.headThickness, 0.01, 0.035, 0.001),
    )
    if (n.style !== 'round')
      dimensions.push(detail('headHeight', 'Head height', n.headHeight, 0.055, 0.18, 0.001))
  }
  dimensions.push(detail('headAngle', 'Head angle', n.headAngle, -15, 40, 1, '°'))
  if (n.style === 'soft-square')
    dimensions.push(detail('cornerRadius', 'Corner radius', n.cornerRadius, 0.003, 0.04, 0.001))
  if (n.nozzlesEnabled)
    dimensions.push(
      detail('nozzleSpacing', 'Nozzle spacing', n.nozzleSpacing, 0.007, 0.025, 0.001),
      detail('nozzleDiameter', 'Nozzle diameter', n.nozzleDiameter, 0.0015, 0.005, 0.0005),
    )
  return geometrySection(buildHandShowerGeometry(n), dimensions)
}
