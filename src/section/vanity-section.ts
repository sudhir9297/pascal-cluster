import { type VanityNode, CORNER_VANITY, WALL_MOUNTED_VANITY } from '../freestanding-vanity/schema'
import { vanityBays } from '../freestanding-vanity/layout'
import { sectionDimension as dim, sectionDetail as detail, sectionRect as rect, type SectionModel } from './fields'

export function vanitySection(node: VanityNode, maxWidth = 1.8): SectionModel {
  const corner = node.type === CORNER_VANITY, wall = node.type === WALL_MOUNTED_VANITY
  const r = node.width / Math.SQRT2, f = r * .65, overhang = node.countertopEnabled ? node.countertopOverhang : 0
  const planWidth = (corner ? r * 2 : node.width) + overhang * 2
  const w = corner ? r * 1.35 : node.width, d = corner ? r * 1.35 : node.depth, h = node.height
  const base = wall ? node.mountingHeight : node.legHeight
  const top = node.countertopEnabled ? node.countertopThickness : 0, t = node.panelThickness
  const cabinetHeight = h - base - top
  const splash = node.countertopEnabled ? node.backsplashHeight : 0
  const sectionWidth = w + overhang * 2
  let section = rect(overhang, splash + top, w, cabinetHeight) + rect(overhang + t, splash + top + t, w - 2 * t, cabinetHeight - 2 * t)
    + (top ? rect(0, splash, sectionWidth, top) : '')
  if (!wall) section += node.baseStyle === 'plinth' ? rect(overhang + t, splash + h - base, w - t * 2, base)
    : rect(overhang + node.legInset, splash + h - base, node.legWidth, base) + rect(overhang + w - node.legInset - node.legWidth, splash + h - base, node.legWidth, base)
  if (splash) section += rect(overhang, 0, w, splash)
  const plan = corner ? `M${r + overhang},${d + overhang * 2}L0,${r - f + overhang}L${r - f + overhang},0H${r + f + overhang}L${planWidth},${r - f + overhang}Z` : rect(0, 0, planWidth, d + overhang * 2)
  let drawingDetail = ''
  const bays = vanityBays(node)
  let x = overhang + t
  const available = w - t * 2, weights = bays.reduce((sum, bay) => sum + bay.widthWeight, 0)
  for (const bay of bays) {
    const bw = available * bay.widthWeight / weights
    if (x > overhang + t) drawingDetail += `M${x},${splash + top + t}V${splash + h - base - t}`
    const divisions = bay.kind === 'drawers' ? bay.drawerHeights.length : bay.shelves + 1
    for (let row = 1; row < divisions; row++) drawingDetail += `M${x},${splash + top + cabinetHeight * row / divisions}h${bw}`
    x += bw
  }
  if (!wall && node.lowerShelf) drawingDetail += `M${overhang + t},${splash + h - base / 2}H${overhang + w - t}`
  const dimensions = [dim('width', corner ? 'Wall length' : 'Width', node.width, .55, corner ? 1.2 : maxWidth, corner ? .01 : .05, 'plan', 'x', corner ? r * 2 : node.width), { ...dim('height', 'Height', h, .55, 1.1, .01), start: splash }]
  if (!corner) dimensions.splice(1, 0, dim('depth', 'Depth', node.depth, .35, .75, .01, 'plan', 'y'))
  dimensions.push({ ...dim(wall ? 'mountingHeight' : 'legHeight', wall ? 'Floor clearance' : 'Base height', base, wall ? .1 : .06, wall ? Math.min(.4, h - top - .2) : .3, .01), start: splash + h, direction: -1 })
  dimensions.push(detail('panelThickness', 'Panel thickness', t, .012, .03, .001))
  if (node.countertopEnabled) dimensions.push(detail('countertopThickness', 'Countertop thickness', top, .015, .06, .005), detail('countertopOverhang', 'Countertop overhang', overhang, 0, .05, .005), detail('backsplashHeight', 'Backsplash height', splash, 0, .2, .01))
  if (!wall && node.baseStyle !== 'plinth') dimensions.push(detail('legWidth', 'Leg width', node.legWidth, .025, .075, .005), detail('legInset', 'Leg inset', node.legInset, 0, .06, .005))
  if (!corner && bays.some(bay => bay.kind === 'drawers') && !['console', 'custom'].includes(node.storageLayout)) dimensions.push(detail('drawerRows', 'Drawer rows', node.drawerRows, 1, 4, 1, ''))
  if (node.storageLayout === 'drawers') dimensions.push(detail('drawerColumns', 'Drawer columns', node.drawerColumns, 1, 3, 1, ''))
  if (bays.some(bay => bay.kind === 'doors') && node.storageLayout !== 'custom') dimensions.push(detail('interiorShelves', 'Interior shelves', node.interiorShelves, 0, 3, 1, ''))
  return { drawing: { width: planWidth, sectionWidth, depth: d + overhang * 2, height: h + splash, plan, section, detail: drawingDetail, floor: true }, dimensions }
}
