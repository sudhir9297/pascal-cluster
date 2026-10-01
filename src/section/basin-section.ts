import { basinDepth, type BasinNode, FULL_PEDESTAL_BASIN, HALF_PEDESTAL_BASIN, WALL_HUNG_BASIN, SEMI_RECESSED_BASIN, DROP_IN_BASIN, UNDERMOUNT_BASIN, isInsetBasinKind } from '../countertop-basin/schema'
import { wallBasinMinimumMountHeight, wallBasinOutline } from '../wall-hung-basin/profile'
import { sectionDimension as dim, sectionDetail as detail, sectionRect as rect, sectionEllipse as ellipse, type SectionModel } from './fields'

export function basinSection(node: BasinNode, elevationOffset = 0): SectionModel {
  const w = node.width, d = basinDepth(node), h = node.height, t = node.wallThickness
  const wall = node.type === FULL_PEDESTAL_BASIN || node.type === HALF_PEDESTAL_BASIN || node.type === WALL_HUNG_BASIN
  const round = !wall && node.shape === 'round', inset = isInsetBasinKind(node.type)
  const flange = node.type === UNDERMOUNT_BASIN || node.type === DROP_IN_BASIN ? node.flangeWidth : 0
  const width = w + flange * 2, rim = node.type === DROP_IN_BASIN ? node.rimHeight : 0
  const elevation = node.type === FULL_PEDESTAL_BASIN ? node.totalHeight : node.position[1] + elevationOffset
  const aboveMount = wall || node.type === UNDERMOUNT_BASIN ? 0 : node.type === DROP_IN_BASIN ? rim : node.type === SEMI_RECESSED_BASIN ? h - node.recessDepth : h
  const supportHeight = node.type === FULL_PEDESTAL_BASIN ? node.totalHeight : node.type === HALF_PEDESTAL_BASIN ? h + node.shroudHeight : h + rim
  const total = Math.max(supportHeight, elevation + aboveMount)
  const taper = w * node.taper / 2, top = Math.max(0, total - elevation - aboveMount) + rim
  // The drain is an opening in the shell, rather than a continuous solid floor.
  let section = `M${flange},${top}L${flange + taper},${top + h}H${flange + w - taper}L${flange + w},${top}H${flange + w - t}L${flange + w - taper - t},${top + h - t}H${flange + taper + t}L${flange + t},${top}Z`
    + rect(width / 2 - node.drainDiameter / 2, top + h - t, node.drainDiameter, t)
  if (flange) section += rect(0, top - rim, flange + t, Math.max(rim, t)) + rect(width - flange - t, top - rim, flange + t, Math.max(rim, t))
  let plan = wall ? `M${wallBasinOutline(node).map(([x, z]) => `${x + width / 2},${d / 2 - z}`).join('L')}Z`
    : node.shape === 'rectangle' ? rect(0, 0, width, d + flange * 2) : ellipse(width, d + flange * 2)
  let planDetail = ellipse(node.drainDiameter, node.drainDiameter, width / 2 - node.drainDiameter / 2, (d + flange * 2 - node.drainDiameter) / 2)
  let drawingDetail = node.drainCover ? rect(width / 2 - node.drainDiameter / 2 - .004, top + h - t - .004, node.drainDiameter + .008, .004) : ''
  const dimensions = [dim('width', round ? 'Diameter' : 'Width', w, wall ? .45 : .3, .8, .01, 'plan', 'x', w)]
  if (!round) dimensions.push(dim('depth', wall ? 'Projection' : 'Depth', d, wall ? .42 : .3, .55, .01, 'plan', 'y'))
  dimensions.push({ ...dim('height', 'Bowl height', h, node.type === SEMI_RECESSED_BASIN ? .12 : .08, .22, .005), start: top })
  dimensions.push(detail('wallThickness', 'Wall thickness', t, .006, .025, .001), detail('taper', 'Base taper', node.taper, 0, .4, .02, ''), detail('drainDiameter', 'Drain diameter', node.drainDiameter, .035, .05, .001))
  if (node.type === FULL_PEDESTAL_BASIN) {
    section += rect((width - node.pedestalWidth) / 2, top + h, node.pedestalWidth, node.totalHeight - h)
    planDetail += rect((width - node.pedestalWidth) / 2, (d - node.pedestalDepth) / 2, node.pedestalWidth, node.pedestalDepth)
    dimensions.push(dim('totalHeight', 'Total height', node.totalHeight, .7, .95, .005), detail('pedestalWidth', 'Pedestal width', node.pedestalWidth, .14, .3, .005), detail('pedestalDepth', 'Pedestal depth', node.pedestalDepth, .14, .3, .005))
  } else {
    const minElevation = Math.min(0, elevation)
    dimensions.push({ ...dim('elevation', wall || inset ? 'Mount height from floor' : 'Base height from floor', elevation, minElevation, Math.max(3, elevation + 1), .01), start: total, direction: -1, patch: value => ({ position: [node.position[0], value - elevationOffset, node.position[2]] }) })
  }
  if (node.type === HALF_PEDESTAL_BASIN) {
    section += rect((width - node.shroudWidth) / 2, top + h, node.shroudWidth, node.shroudHeight)
    planDetail += rect((width - node.shroudWidth) / 2, (d - node.shroudDepth) / 2, node.shroudWidth, node.shroudDepth)
    dimensions.push({ ...dim('shroudHeight', 'Shroud height', node.shroudHeight, .12, .38, .005), start: top + h }, detail('shroudWidth', 'Shroud width', node.shroudWidth, .18, .38, .005), detail('shroudDepth', 'Shroud depth', node.shroudDepth, .18, .4, .005))
  }
  if (node.type === WALL_HUNG_BASIN && node.plumbingEnabled) {
    drawingDetail += rect(width / 2 - .02, top + h, .04, node.plumbingDrop)
    dimensions.push(detail('plumbingDrop', 'Waste outlet drop', node.plumbingDrop, .12, .4, .01))
  }
  if (flange) dimensions.push(detail('flangeWidth', node.type === DROP_IN_BASIN ? 'Rim overhang' : 'Mounting flange', flange, .01, .04, .001))
  if (node.type === DROP_IN_BASIN) dimensions.push(detail('rimHeight', 'Rim height', rim, .004, .02, .001))
  if (node.type === SEMI_RECESSED_BASIN) {
    planDetail += `M0,${d - node.frontProjection}H${width}`
    dimensions.push(detail('frontProjection', 'Front projection', node.frontProjection, .04, .18, .005), detail('recessDepth', 'Recess depth', node.recessDepth, .03, .1, .005))
  }
  return { drawing: { width, depth: d + flange * 2, height: total, fixtureHeight: supportHeight + (node.type === WALL_HUNG_BASIN && node.plumbingEnabled ? node.plumbingDrop : 0), plan, planDetail, section, detail: drawingDetail, floor: true, datum: !wall ? { y: top + aboveMount - rim, label: inset ? 'Mounting plane' : 'Base' } : undefined }, dimensions }
}
