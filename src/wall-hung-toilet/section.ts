import { sectionDetail as detailField } from '../section/fields'
import type { SectionDimension, SectionDrawing } from '../section/model'
import { toiletOutline } from './profile'
import { toiletLayout, type WallHungToiletNode } from './schema'
const rect = (x: number, y: number, w: number, h: number) =>
  `M${x},${y}h${w}v${h}h${-w}Z`
export function toiletSection(n: WallHungToiletNode): {
  drawing: SectionDrawing
  dimensions: SectionDimension[]
} {
  const l = toiletLayout(n),
    w = Math.max(n.width, l.external ? n.tankWidth + 0.008 : 0),
    h = l.totalHeight,
    t = n.wallThickness
  const offset = (w - n.width) / 2,
    top = h - n.mountingHeight,
    inset = (n.width * n.taper) / 2
  const outline = toiletOutline(n).map(([x, z]) => [
    x + w / 2,
    n.depth / 2 - z + l.rearSpace,
  ])
  let plan = `M${outline.map((p) => p.join(',')).join('L')}Z`
  let section = `M${offset},${top}L${offset + inset},${top + n.height}H${offset + n.width - inset}L${offset + n.width},${top}H${offset + n.width - t}L${offset + n.width - inset - t},${top + n.height - t}H${offset + inset + t}L${offset + t},${top}Z`
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
  let detail = l.external
    ? rect(
        (w - n.tankWidth) / 2,
        h - l.tankBottom - n.tankHeight,
        n.tankWidth,
        n.tankHeight,
      )
    : ''
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
      max: 0.38,
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
      min: Math.min(0, n.mountingHeight),
      max: Math.max(3, n.mountingHeight + 1),
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
