import { sectionDetail as detailField } from '../section/fields'
import type { SectionDimension, SectionDrawing } from '../section/model'
import { ceramicRings, toiletOutline } from './profile'
import {
  toiletLayout,
  isOnePiece,
  type FloorStandingToiletNode,
} from './schema'
const rect = (x: number, y: number, w: number, h: number) =>
  `M${x},${y}h${w}v${h}h${-w}Z`
export function toiletSection(n: FloorStandingToiletNode): {
  drawing: SectionDrawing
  dimensions: SectionDimension[]
} {
  const l = toiletLayout(n),
    w = Math.max(n.width, l.external ? n.tankWidth + 0.008 : 0),
    h = l.totalHeight
  const offset = (w - n.width) / 2,
    top = h - n.mountingHeight
  const outline = toiletOutline(n).map(([x, z]) => [
    x + w / 2,
    n.depth / 2 - z + l.rearSpace,
  ])
  let plan = `M${outline.map((p) => p.join(',')).join('L')}Z`
  const rings = ceramicRings(n)
  const side = (sign: number) =>
    `M${rings.map(([width, , y]) => [w / 2 + (sign * width) / 2, top - y].join(',')).join('L')}Z`
  let section = side(-1) + side(1)
  if (n.seatEnabled)
    section +=
      rect(offset, top - n.seatThickness, 0.045, n.seatThickness) +
      rect(
        offset + n.width - 0.045,
        top - n.seatThickness,
        0.045,
        n.seatThickness,
      )
  if (n.lidEnabled)
    section += n.lidOpen
      ? rect(offset, top - n.depth, n.width, n.depth)
      : rect(offset, top - n.seatThickness - 0.02, n.width, 0.015)
  if (l.external)
    plan += rect((w - n.tankWidth) / 2, 0, n.tankWidth, n.tankDepth)
  // A-A is a transverse cut through the bowl. The tank behind the cut is drawn as an elevation detail.
  const tankTop = h - l.tankBottom - n.tankHeight
  const tankInset = (n.tankWidth * n.tankTaper) / 2
  let detail = l.external
    ? `M${(w - n.tankWidth) / 2},${tankTop}h${n.tankWidth}l${-tankInset},${n.tankHeight}h${-n.tankWidth + 2 * tankInset}Z` +
      rect(
        (w - n.tankWidth - 0.008) / 2,
        tankTop - n.tankLidThickness,
        n.tankWidth + 0.008,
        n.tankLidThickness,
      )
    : ''
  if (n.tankType === 'attached')
    detail += isOnePiece(n)
      ? rect(
          (w - n.tankWidth * 0.85) / 2,
          top - 0.02,
          n.tankWidth * 0.85,
          n.mountingHeight + 0.02,
        )
      : rect((w - n.tankWidth * 0.8) / 2, top - 0.015, n.tankWidth * 0.8, 0.045)
  if (l.external && n.tankType !== 'attached')
    detail += rect(
      w / 2 - n.pipeDiameter / 2,
      h - l.tankBottom,
      n.pipeDiameter,
      l.tankBottom - n.mountingHeight,
    )
  const dimensions: SectionDimension[] = [
    {
      key: 'width',
      label: 'Bowl width',
      value: n.width,
      min: 0.32,
      max: 0.48,
      step: 0.01,
      view: 'plan',
      axis: 'x',
      span: n.width,
    },
    {
      key: 'depth',
      label: 'Bowl projection',
      value: n.depth,
      min: 0.42,
      max: 0.75,
      step: 0.01,
      view: 'plan',
      axis: 'y',
      span: n.depth,
      start: l.rearSpace,
    },
    {
      key: 'height',
      label: 'Bowl height',
      value: n.height,
      min: 0.22,
      max: Math.min(0.38, n.mountingHeight - 0.02),
      step: 0.01,
      view: 'section',
      axis: 'y',
      span: n.height,
      start: top,
    },
    {
      key: 'mountingHeight',
      label: 'Rim height from floor',
      value: n.mountingHeight,
      min: 0.36,
      max: 0.5,
      step: 0.01,
      view: 'section',
      axis: 'y',
      span: n.mountingHeight,
      start: h,
      direction: -1,
    },
  ]
  dimensions.push(
    detailField(
      'baseWidth',
      'Foot width',
      Math.min(n.baseWidth, n.width),
      0.18,
      Math.min(0.44, n.width),
      0.01,
    ),
    detailField(
      'baseDepth',
      'Foot depth',
      Math.min(n.baseDepth, n.depth),
      0.28,
      Math.min(0.7, n.depth),
      0.01,
    ),
  )
  dimensions.push(
    detailField(
      'wallThickness',
      'Bowl wall thickness',
      n.wallThickness,
      0.012,
      0.035,
      0.001,
    ),
    detailField('taper', 'Bowl taper', n.taper, 0, 0.45, 0.01, ''),
  )
  if (n.seatEnabled)
    dimensions.push(
      detailField(
        'seatThickness',
        'Seat thickness',
        n.seatThickness,
        0.012,
        0.04,
        0.001,
      ),
    )
  if (l.external) {
    dimensions.push(
      detailField(
        'tankCornerRadius',
        'Tank corner radius',
        n.tankCornerRadius,
        0.002,
        0.045,
        0.001,
      ),
      detailField(
        'tankLidThickness',
        'Cistern lid thickness',
        n.tankLidThickness,
        0.008,
        0.035,
        0.001,
      ),
      detailField('tankTaper', 'Tank taper', n.tankTaper, 0, 0.25, 0.01, ''),
    )
    if (n.tankType === 'attached' && !isOnePiece(n))
      dimensions.push(
        detailField(
          'couplingGap',
          'Tank-to-bowl joint gap',
          n.couplingGap,
          0.005,
          0.06,
          0.001,
        ),
      )
    dimensions.push(
      detailField('tankWidth', 'Cistern width', n.tankWidth, 0.28, 0.55, 0.01),
      detailField('tankDepth', 'Cistern depth', n.tankDepth, 0.12, 0.24, 0.01),
      detailField(
        'tankHeight',
        'Cistern height',
        n.tankHeight,
        0.28,
        0.5,
        0.01,
      ),
    )
    if (n.tankType !== 'attached')
      dimensions.push(
        detailField(
          'tankBottom',
          'Cistern bottom from floor',
          n.tankBottom,
          n.tankType === 'high-level'
            ? 1.5
            : Math.max(0.5, n.mountingHeight + 0.08),
          1.9,
          0.01,
        ),
        detailField(
          'pipeDiameter',
          'Flush pipe diameter',
          n.pipeDiameter,
          0.035,
          0.06,
          0.001,
        ),
      )
  }
  return {
    drawing: {
      width: w,
      depth: l.projection,
      height: h,
      plan,
      section,
      detail,
      floor: true,
      cutPosition: (l.rearSpace + n.depth / 2) / l.projection,
    },
    dimensions,
  }
}
