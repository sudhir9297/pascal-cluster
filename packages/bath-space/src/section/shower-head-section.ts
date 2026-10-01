import { buildShowerHeadGeometry } from '../shower-head/geometry'
import { geometrySection } from './geometry-section'
import { isCircularHead } from '../shower-head/geometry'
import type { ShowerHeadNode } from '../shower-head/schema'
import { sectionDimension as dim, sectionDetail as detail, type SectionModel } from './fields'

// Parameter values remain in the head's own axes; the drawing includes tilt and swivel.
export function showerHeadSection(n: ShowerHeadNode): SectionModel {
  const circular = isCircularHead(n)
  const bodyHeight = n.style === 'bell' ? n.bellHeight : n.thickness
  const dimensions = [
    dim('width', circular ? 'Head diameter' : 'Head width', n.width, 0.06, 0.6, 0.001, 'plan', 'x'),
    dim('neckLength', 'Connector length', n.neckLength, 0.015, 0.15, 0.001),
    {
      ...dim(
        n.style === 'bell' ? 'bellHeight' : 'thickness',
        n.style === 'bell' ? 'Bell height' : 'Head thickness',
        bodyHeight,
        n.style === 'bell' ? 0.03 : 0.008,
        n.style === 'bell' ? 0.18 : 0.1,
        0.001,
      ),
      start: n.neckLength,
    },
    detail('neckDiameter', 'Connector diameter', n.neckDiameter, 0.015, 0.05, 0.001),
  ]
  if (!circular) dimensions.push(dim('depth', 'Head depth', n.depth, 0.06, 0.6, 0.001, 'plan', 'y'))
  if (n.style === 'soft-square')
    dimensions.push(
      detail(
        'cornerRadius',
        'Corner radius',
        n.cornerRadius,
        0.002,
        Math.min(0.12, n.width / 2, n.depth / 2),
        0.001,
      ),
    )
  dimensions.push(
    detail('tilt', 'Head tilt', n.tilt, -20, 20, 1, '°'),
    detail('swivel', 'Head swivel', n.swivel, -180, 180, 1, '°'),
  )
  if (n.nozzlesEnabled)
    dimensions.push(
      detail('nozzleSpacing', 'Nozzle spacing', n.nozzleSpacing, 0.008, 0.045, 0.001),
      detail('nozzleDiameter', 'Nozzle diameter', n.nozzleDiameter, 0.0015, 0.006, 0.0005),
    )
  return geometrySection(buildShowerHeadGeometry(n), dimensions)
}
