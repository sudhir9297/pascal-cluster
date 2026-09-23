'use client'
import type { PergolaNode } from '../domain/schema'
import { pergolaRoofLayout } from '../domain/layout'

export function RoofLayoutControl({
  node,
  onUpdate,
}: {
  node: PergolaNode
  onUpdate: (patch: Partial<PergolaNode>) => void
}) {
  return (
    <label
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <span>Member layout</span>
      <select
        aria-label="Member layout"
        value={pergolaRoofLayout(node)}
        onChange={(event) =>
          onUpdate({ roofLayout: event.target.value as NonNullable<PergolaNode['roofLayout']> })
        }
        style={{
          maxWidth: 150,
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '5px 7px',
          background: 'var(--background)',
          color: 'inherit',
        }}
      >
        <option value="rafters">Open rafters</option>
        <option value="slatted">Shade slats</option>
        <option value="grid">Roof grid</option>
      </select>
    </label>
  )
}
