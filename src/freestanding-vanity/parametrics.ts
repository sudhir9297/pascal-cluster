import type { ParamField } from '@pascal-app/core'
import { type VanityNode, WALL_MOUNTED_VANITY } from './schema'
import { vanityBays } from './layout'

const hasDrawers = (node: VanityNode) => vanityBays(node).some((bay) => bay.kind === 'drawers')
const hasDoors = (node: VanityNode) => vanityBays(node).some((bay) => bay.kind === 'doors')
const freestanding = (node: VanityNode) => node.type !== WALL_MOUNTED_VANITY

type VanityParameterGroup = { label: string; fields: Array<Exclude<ParamField<VanityNode>, { kind: 'custom' }>> }
export const vanityParameterGroups: VanityParameterGroup[] = [
  { label: 'Dimensions', fields: [
    { key: 'width', label: 'Width', kind: 'number', unit: 'm', min: 0.55, max: 1.8, step: 0.05 },
    { key: 'height', label: 'Height', kind: 'number', unit: 'm', min: 0.55, max: 1.1, step: 0.01 },
    { key: 'mountingHeight', label: 'Floor clearance', kind: 'number', unit: 'm', min: 0.1, max: 0.4, step: 0.01, visibleIf: (node) => !freestanding(node) },
    { key: 'depth', label: 'Depth', kind: 'number', unit: 'm', min: 0.35, max: 0.75, step: 0.01 },
    { key: 'panelThickness', label: 'Cabinet panel thickness', kind: 'number', unit: 'm', min: 0.012, max: 0.03, step: 0.001 },
  ] },
  { label: 'Storage', fields: [
    { key: 'storageLayout', label: 'Layout', kind: 'enum', options: ['drawers', 'doors', 'mixed', 'drawer-left', 'drawer-right', 'console', 'custom'] },
    { key: 'drawerRows', label: 'Drawer rows', kind: 'number', min: 1, max: 4, step: 1, visibleIf: (node) => hasDrawers(node) && !['console', 'custom'].includes(node.storageLayout) },
    { key: 'drawerColumns', label: 'Drawer columns', kind: 'number', min: 1, max: 3, step: 1, visibleIf: (node) => node.storageLayout === 'drawers' },
    { key: 'drawerType', label: 'Drawer construction', kind: 'enum', options: ['standard', 'shallow-top'], visibleIf: (node) => hasDrawers(node) && node.storageLayout !== 'custom' },
    { key: 'drawerOpen', label: 'Drawer opening', kind: 'number', min: 0, max: 1, step: 0.05, visibleIf: hasDrawers },
    { key: 'doorCount', label: 'Door count', kind: 'number', min: 1, max: 4, step: 1, visibleIf: (node) => node.storageLayout === 'doors' },
    { key: 'doorOpen', label: 'Door opening', kind: 'number', unit: '°', min: 0, max: 110, step: 5, visibleIf: hasDoors },
    { key: 'interiorShelves', label: 'Interior shelves', kind: 'number', min: 0, max: 3, step: 1, visibleIf: (node) => hasDoors(node) && node.storageLayout !== 'custom' },
  ] },
  { label: 'Fronts and handles', fields: [
    { key: 'frontStyle', label: 'Front style', kind: 'enum', options: ['flat', 'shaker', 'fluted'] },
    { key: 'frontMount', label: 'Front mounting', kind: 'enum', options: ['overlay', 'inset'] },
    { key: 'frontGap', label: 'Gap between fronts', kind: 'number', unit: 'm', min: 0.002, max: 0.012, step: 0.001 },
    { key: 'frameWidth', label: 'Shaker frame width', kind: 'number', unit: 'm', min: 0.025, max: 0.08, step: 0.005, visibleIf: (node) => node.frontStyle === 'shaker' },
    { key: 'fluteSpacing', label: 'Flute spacing', kind: 'number', unit: 'm', min: 0.012, max: 0.035, step: 0.001, visibleIf: (node) => node.frontStyle === 'fluted' },
    { key: 'handleStyle', label: 'Handle style', kind: 'enum', options: ['bar', 'knob', 'edge', 'none'] },
    { key: 'handleLength', label: 'Pull length', kind: 'number', unit: 'm', min: 0.06, max: 0.3, step: 0.01, visibleIf: (node) => ['bar', 'edge'].includes(node.handleStyle) },
  ] },
  { label: 'Legs and base', fields: [
    { key: 'baseStyle', label: 'Base style', kind: 'enum', options: ['square', 'tapered', 'metal', 'plinth'], visibleIf: freestanding },
    { key: 'legHeight', label: 'Base height', kind: 'number', unit: 'm', min: 0.06, max: 0.3, step: 0.01, visibleIf: freestanding },
    { key: 'legWidth', label: 'Leg width', kind: 'number', unit: 'm', min: 0.025, max: 0.075, step: 0.005, visibleIf: (node) => freestanding(node) && node.baseStyle !== 'plinth' },
    { key: 'legInset', label: 'Leg inset', kind: 'number', unit: 'm', min: 0, max: 0.06, step: 0.005, visibleIf: (node) => freestanding(node) && node.baseStyle !== 'plinth' },
    { key: 'lowerShelf', label: 'Shelf between legs', kind: 'boolean', visibleIf: (node) => freestanding(node) && node.baseStyle !== 'plinth' && !['console', 'custom'].includes(node.storageLayout) },
  ] },
  { label: 'Countertop', fields: [
    { key: 'countertopEnabled', label: 'Include countertop', kind: 'boolean' },
    { key: 'countertopThickness', label: 'Top thickness', kind: 'number', unit: 'm', min: 0.015, max: 0.06, step: 0.005, visibleIf: (node) => node.countertopEnabled },
    { key: 'countertopOverhang', label: 'Top overhang', kind: 'number', unit: 'm', min: 0, max: 0.05, step: 0.005, visibleIf: (node) => node.countertopEnabled },
    { key: 'countertopEdge', label: 'Top edge', kind: 'enum', options: ['square', 'soft'], visibleIf: (node) => node.countertopEnabled },
    { key: 'backsplashHeight', label: 'Backsplash height', kind: 'number', unit: 'm', min: 0, max: 0.2, step: 0.01, visibleIf: (node) => node.countertopEnabled },
  ] },
]

export const vanityOptionLabels: Record<string, string> = {
  drawers: 'Drawer stacks', doors: 'Doors + shelves', mixed: 'Drawers on both sides',
  'drawer-left': 'Drawers on left', 'drawer-right': 'Drawers on right', console: 'Open console', custom: 'Custom sections',
  standard: 'Equal-height drawers', 'shallow-top': 'Shallow top drawer',
  flat: 'Flat panel', shaker: 'Shaker frame', fluted: 'Fluted / reeded',
  overlay: 'Overlay', inset: 'Inset', bar: 'Bar pull', knob: 'Round knob', edge: 'Edge pull', none: 'Handleless',
  square: 'Square wood legs', tapered: 'Tapered wood legs', metal: 'Round metal legs', plinth: 'Recessed plinth',
  soft: 'Soft edge',
}
