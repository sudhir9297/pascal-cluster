import type { TapNode } from '../taps/schema'
import { tapDimensions } from '../taps/geometry'
import { sectionDimension as dim, sectionDetail as detail, sectionRect as rect, sectionEllipse as ellipse, type SectionModel } from './fields'

export function tapSection(node: TapNode): SectionModel {
  const p = tapDimensions(node), body = p.bodyRadius * 2, reach = p.reach, h = p.height, spout = p.spoutDiameter
  const base = p.mount === 'countertop' && node.baseStyle !== 'none'
  const width = Math.max(reach, base ? p.baseWidth : body, body + p.handleLength)
  const depth = Math.max(body, base ? p.baseWidth : body, p.design === 'mixer' ? p.wallSpacing + body : p.mountingLayout === 'three-hole' ? node.holeSpacing + body : 0)
  const outlet = p.mount === 'wall' ? h * .3 : h * p.outletDrop
  let section = rect(0, 0, body, h) + rect(body, 0, Math.max(.001, reach - body), spout)
    + rect(reach - spout, spout, spout, Math.max(.001, outlet - spout))
  if (base) section += rect(0, h - p.baseHeight, p.baseWidth, p.baseHeight)
  const angle = node.handleAngle, handleY = h * .22
  const hx = body + p.handleLength * Math.cos(angle), hy = handleY - p.handleLength * Math.sin(angle)
  section += `M${body},${handleY}L${hx},${hy}L${hx},${hy + p.handleThickness}L${body},${handleY + p.handleThickness}Z`
  let drawingDetail = node.aeratorEnabled ? `M${reach - spout},${outlet}h${spout}` : ''
  if (p.design === 'spring') for (let i = 0; i < p.springTurns; i++) {
    const y = h * .15 + h * .65 * i / p.springTurns
    drawingDetail += `M${body / 2 - p.springRadius},${y}h${p.springRadius * 2}`
  }
  const plan = rect(0, (depth - body) / 2, reach, body)
  let planDetail = rect(body, (depth - body) / 2, p.handleLength, p.handleThickness)
  if (base) planDetail += rect(0, (depth - p.baseWidth) / 2, p.baseWidth, p.baseWidth)
  const spacing = p.design === 'mixer' ? p.wallSpacing : p.mountingLayout === 'three-hole' ? node.holeSpacing : 0
  if (spacing) planDetail += ellipse(body, body, 0, (depth - body - spacing) / 2) + ellipse(body, body, 0, (depth - body + spacing) / 2)
  const dimensions = [dim('reach', 'Spout reach', reach, .1, .3, .01, 'plan', 'x'), dim('height', p.design === 'plate' ? 'Plate height' : 'Height', h, .12, .6, .01)]
  dimensions.push(detail('bodyRadius', 'Body radius', p.bodyRadius, .012, .04, .001), detail('spoutDiameter', 'Spout thickness', spout, .012, .05, .001), detail('handleLength', 'Handle length', p.handleLength, .035, .12, .001), detail('handleThickness', 'Handle thickness', p.handleThickness, .004, .018, .001), detail('handleAngle', 'Handle opening', angle, -.5, .5, .05, 'rad'))
  if (p.mount !== 'wall' && !['lever', 'waterfall'].includes(p.design)) dimensions.push(detail('outletDrop', 'Outlet drop ratio', p.outletDrop, .12, .4, .01, ''))
  if (base) dimensions.push(detail('baseWidth', 'Base width', p.baseWidth, Math.max(.028, p.bodyRadius * 2.1), .14, .001), detail('baseHeight', 'Base height', p.baseHeight, .004, .025, .001))
  if (p.design === 'spring') {
    section += rect(reach - spout, outlet, spout * 1.3, p.sprayHeadLength)
    dimensions.push(detail('springTurns', 'Spring turns', p.springTurns, 12, 44, 1, ''), detail('springRadius', 'Spring radius', p.springRadius, .012, .035, .001), detail('sprayHeadLength', 'Spray head length', p.sprayHeadLength, .035, .09, .001))
  }
  if (p.design === 'mixer') dimensions.push(detail('wallSpacing', 'Wall fitting spacing', p.wallSpacing, .12, .22, .005))
  return { drawing: { width, depth, height: h, plan, planDetail, section, detail: drawingDetail }, dimensions }
}
