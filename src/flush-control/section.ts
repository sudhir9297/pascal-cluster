import { sectionDimension, sectionDetail, sectionRect } from '../section/fields'
import { controlOutline } from './geometry'
import { controlDimensions, type FlushControlNode } from './schema'
export function flushControlSection(n: FlushControlNode) {
  const d = controlDimensions(n),
    points = controlOutline(n.shape, d.width, d.height).getPoints(48)
  const face = `M${points.map((p) => [p.x + d.width / 2, d.height / 2 - p.y].join(',')).join('L')}Z`
  const chain =
    'mount' in n && n.mount === 'pull-chain' ? n.chainLength + 0.06 : 0
  const dimensions = [
    sectionDimension(
      'width',
      'Control width',
      n.width,
      0.03,
      0.35,
      0.005,
      'plan',
      'x',
    ),
    sectionDimension(
      'thickness',
      'Plate thickness',
      n.thickness,
      0.003,
      0.03,
      0.001,
      'section',
      'x',
    ),
  ]
  if (n.shape !== 'round' && n.shape !== 'square')
    dimensions.push(
      sectionDimension(
        'height',
        'Control height',
        n.height,
        0.03,
        0.25,
        0.005,
        'plan',
        'y',
      ),
    )
  dimensions.push(
    sectionDetail('edgeRadius', 'Edge bevel radius', n.edgeRadius, 0.0003, 0.004, 0.0001),
  )
  if (n.flushMode !== 'touchless')
    dimensions.push(sectionDetail('seamWidth', 'Button reveal width', n.seamWidth, 0.0003, 0.002, 0.0001))
  const count = n.flushMode === 'dual' ? 2 : 1
  const maxButtonSize = Math.min(
    0.08,
    d.height * 0.65,
    d.width / (count === 2 ? 3 : 1.5),
  )
  const size = Math.min(n.buttonSize, maxButtonSize)
  if (n.flushMode !== 'touchless' && maxButtonSize >= 0.012)
    dimensions.push(
      sectionDetail(
        'buttonSize',
        'Button size',
        size,
        0.012,
        maxButtonSize,
        0.001,
      ),
    )
  let planDetail = '',
    buttons = ''
  if (n.flushMode === 'touchless') {
    const width = Math.min(0.04, d.width * 0.3),
      height = Math.min(0.018, d.height * 0.3)
    planDetail = sectionRect(
      (d.width - width) / 2,
      (d.height - height) / 2,
      width,
      height,
    )
    buttons = sectionRect(
      n.thickness,
      (d.height - height) / 2,
      n.buttonProjection,
      height,
    )
  } else
    for (let i = 0; i < count; i++) {
      const width = size * (count === 2 && i === 1 ? 0.75 : 1)
      const height = n.buttonShape === 'oval' ? width * 0.65 : width
      const x =
        d.width / 2 + (count === 1 ? 0 : (i === 0 ? -1 : 1) * d.width * 0.2)
      const shape = controlOutline(
        n.buttonShape === 'rectangle'
          ? 'rectangle'
          : n.buttonShape === 'oval'
            ? 'oval'
            : 'round',
        width,
        height,
      ).getPoints(32)
      const gap = Math.min(n.seamWidth, width * 0.05, height * 0.05)
      const reveal = controlOutline(n.buttonShape === 'rectangle' ? 'rectangle' : n.buttonShape === 'oval' ? 'oval' : 'round', width + 2 * gap, height + 2 * gap).getPoints(48)
      planDetail += `M${reveal.map(p => [p.x + x, d.height / 2 - p.y].join(',')).join('L')}Z`
      planDetail += `M${shape.map((p) => [p.x + x, d.height / 2 - p.y].join(',')).join('L')}Z`
      if (i === 0)
        buttons += sectionRect(
          n.thickness,
          (d.height - height) / 2,
          n.buttonProjection,
          height,
        )
    }
  dimensions.push(
    sectionDetail(
      'buttonProjection',
      'Button projection',
      n.buttonProjection,
      0.002,
      0.015,
      0.001,
    ),
  )
  if (chain)
    dimensions.push(
      sectionDetail(
        'chainLength',
        'Pull chain length',
        (n as import('./schema').CisternFlushControlNode).chainLength,
        0.3,
        1.4,
        0.01,
      ),
    )
  const faceDepth = n.thickness * 0.8
  const bevel = Math.min(n.edgeRadius, faceDepth / 3, d.width / 12, d.height / 12)
  const rear = n.thickness * 0.2
  const profile = `M${rear + bevel},0H${n.thickness - bevel}L${n.thickness},${bevel}V${d.height - bevel}L${n.thickness - bevel},${d.height}H${rear + bevel}L${rear},${d.height - bevel}V${bevel}Z`
  return {
    drawing: {
      width: d.width,
      depth: d.height,
      height: d.height + chain,
      sectionWidth: d.depth,
      plan: face,
      planDetail,
      section:
        sectionRect(0, d.height * 0.02, rear, d.height * 0.96) + profile +
        buttons +
        (chain ? sectionRect(0, d.height / 2, 0.004, chain) : ''),
    },
    dimensions,
  }
}
