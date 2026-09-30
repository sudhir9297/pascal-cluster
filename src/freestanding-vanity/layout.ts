import { type StorageBay, type VanityNode } from './schema'

export type VanityBay = StorageBay & { x: number; width: number }

export function vanityBays(node: VanityNode): VanityBay[] {
  const { width, frontGap: gap, panelThickness: t } = node
  const frontWidth = width - (node.frontMount === 'inset' ? t * 2 : 0) - gap * 2
  const drawerHeights = Array.from({ length: node.storageLayout === 'console' ? 1 : node.drawerRows },
    (_, i) => node.drawerType === 'shallow-top' && node.drawerRows > 1 && i === 0 ? 0.6 : 1)
  const bay = (id: string, kind: StorageBay['kind'], widthWeight = 1): StorageBay => ({
    id, kind, widthWeight, drawerHeights, doorCount: node.storageLayout === 'doors' ? node.doorCount : 2,
    shelves: node.interiorShelves,
  })
  let sections: StorageBay[]
  if (node.storageLayout === 'custom' && node.storageBays.length) sections = node.storageBays
  else if (node.storageLayout === 'mixed') sections = [bay('0', 'drawers', 1), bay('1', 'doors', 2), bay('2', 'drawers', 1)]
  else if (node.storageLayout === 'drawer-left') sections = [bay('0', 'drawers', 0.36), bay('1', 'doors', 0.64)]
  else if (node.storageLayout === 'drawer-right') sections = [bay('1', 'doors', 0.64), bay('0', 'drawers', 0.36)]
  else if (node.storageLayout === 'doors') sections = [bay('0', 'doors')]
  else sections = Array.from({ length: node.storageLayout === 'console' ? 1 : node.drawerColumns }, (_, i) => bay(String(i), 'drawers'))
  // Reserve enough room for a drawer box even in the narrowest permitted cabinet.
  const usableWidth = frontWidth - gap * (sections.length - 1)
  const minimumWidth = Math.min(t * 2 + 0.045, usableWidth / sections.length)
  const weightedWidth = usableWidth - minimumWidth * sections.length
  const totalWeight = sections.reduce((sum, section) => sum + section.widthWeight, 0)
  let left = -frontWidth / 2
  return sections.map((section) => {
    const w = minimumWidth + weightedWidth * section.widthWeight / totalWeight
    const result = { ...section, width: w, x: left + w / 2 }
    left += w + gap
    return result
  })
}

export type VanityPart = { id: string; kind: 'drawer' | 'door' }
export function vanityParts(node: VanityNode): VanityPart[] {
  return vanityBays(node).flatMap((bay) => bay.kind === 'open' ? [] : Array.from(
    { length: bay.kind === 'doors' ? bay.doorCount : bay.drawerHeights.length },
    (_, i) => ({ id: `vanity-${bay.kind === 'doors' ? 'door' : 'drawer'}-${bay.id}-${i}`, kind: bay.kind === 'doors' ? 'door' as const : 'drawer' as const }),
  ))
}

export function vanityPartOpening(node: VanityNode, part: VanityPart): number {
  return node.partOpenings[part.id] ?? (part.kind === 'drawer' ? node.drawerOpen : node.doorOpen / 90)
}

export function customBaysFromLayout(node: VanityNode): StorageBay[] {
  return vanityBays(node).map(({ x: _x, width: _width, ...bay }) => ({
    ...bay, widthWeight: Math.max(0.5, Math.min(2, bay.widthWeight)),
    doorCount: Math.min(2, bay.doorCount),
    drawerHeights: bay.drawerHeights.map((height) => Math.max(0.5, height)),
  }))
}
