import type { FloorplanNodeExtension, FloorplanSchedule } from '@pascal-app/editor'
import { fixtureInventory } from './inventory'

export const bathroomDrawingSchedule: NonNullable<FloorplanNodeExtension['schedule']> = ({ siblings, nodes, unit }) => {
  if (!siblings.length) return null
  const allowedIds = new Set<string>(siblings.map(node => node.id))
  const rows = fixtureInventory(nodes).filter(row => allowedIds.has(row.id) && !row.hidden)
  if (!rows.length) return null
  const imperial = unit === 'imperial'
  const dimensions = (id: string) => {
    const node = nodes[id] as unknown as Record<string, unknown>
    return ['length', 'width', 'depth', 'height'].flatMap(key => {
      const value = node[key]
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return []
      return [`${key[0]!.toUpperCase()} ${imperial ? (value * 3.280839895).toFixed(2) : Math.round(value * 1000)}`]
    }).join(' · ') || '—'
  }
  return {
    id: `${siblings[0]!.type}:fixtures`,
    title: `Bathroom: ${rows[0]!.kind}`,
    columns: [{ key: 'item', label: 'Item', weight: 2 }, { key: 'dimensions', label: `Authored sizes (${imperial ? 'ft' : 'mm'})`, weight: 2 }, { key: 'quantity', label: 'Quantity' }],
    rows: rows.map(row => ({ id: row.id, cells: { item: row.label, dimensions: dimensions(row.id), quantity: '1' } })),
    issues: ['Sizes are authored parameters, not overall assembly dimensions. Attached fittings are scheduled separately.'],
  } satisfies FloorplanSchedule
}
