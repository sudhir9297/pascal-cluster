import { getCatalogMaterialById, getLevelDisplayName, parseMaterialRef, type AnyNode, type BuildingNode, type LevelNode, type SceneMaterial } from '@pascal-app/core'

export type FixtureRow = {
  id: string
  label: string
  kind: string
  levelId: LevelNode['id'] | null
  buildingId: BuildingNode['id'] | null
  level: string
  hidden: boolean
  dimensions: string
  finishes: string
}

export function fixtureInventory(nodes: Readonly<Record<string, AnyNode>>, materials: Readonly<Record<string, SceneMaterial>> = {}): FixtureRow[] {
  return Object.values(nodes).filter(node => String(node.type).startsWith('bath-space:')).map(node => {
    const visited = new Set<string>()
    let ancestor: AnyNode | undefined = node
    let hidden = false
    let levelId: LevelNode['id'] | null = null
    let buildingId: BuildingNode['id'] | null = null
    while (ancestor && !visited.has(ancestor.id)) {
      visited.add(ancestor.id)
      hidden ||= ancestor.visible === false
      if (ancestor.type === 'level' && !levelId) levelId = ancestor.id
      if (ancestor.type === 'building' && !buildingId) buildingId = ancestor.id
      ancestor = ancestor.parentId ? nodes[ancestor.parentId] : undefined
    }
    const raw = node as unknown as Record<string, unknown>
    const slots = raw.slots && typeof raw.slots === 'object' && !Array.isArray(raw.slots)
      ? raw.slots as Record<string, unknown> : {}
    const finishes = Object.entries(slots).sort(([a], [b]) => a.localeCompare(b)).flatMap(([slot, ref]) => {
      if (typeof ref !== 'string' || !ref) return []
      const parsed = parseMaterialRef(ref)
      const name = parsed?.kind === 'scene' ? materials[parsed.id]?.name
        : parsed?.kind === 'library' ? getCatalogMaterialById(parsed.id)?.label : undefined
      return [`${slot.replaceAll('-', ' ')}: ${name || `Unresolved (${ref})`}`]
    }).join('; ')
    const dimensions = ['length', 'width', 'depth', 'height'].flatMap(key => {
      const value = raw[key]
      return typeof value === 'number' && Number.isFinite(value) && value > 0
        ? [`${key[0]!.toUpperCase()} ${Math.round(value * 1000)}`] : []
    }).join(' · ')
    const levelNode = levelId ? nodes[levelId] : undefined
    return { id: node.id, label: node.name || String(node.type).replace('bath-space:', '').replaceAll('-', ' '),
      kind: String(node.type).replace('bath-space:', '').replaceAll('-', ' '), levelId, buildingId,
      level: levelNode?.type === 'level' ? getLevelDisplayName(levelNode) : 'Unassigned', hidden, dimensions, finishes }
  }).sort((a, b) => a.level.localeCompare(b.level) || a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
}

export function fixtureCsv(rows: readonly FixtureRow[]): string {
  const cell = (value: string) => `"${(/^[\s]*[=+@-]/.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`
  return [['ID', 'Item', 'Type', 'Level', 'Visibility', 'Authored dimensions (mm)', 'Assigned finishes', 'Quantity'],
    ...rows.map(row => [row.id, row.label, row.kind, row.level, row.hidden ? 'Hidden' : 'Visible', row.dimensions, row.finishes, '1'])]
    .map(row => row.map(cell).join(',')).join('\r\n')
}
