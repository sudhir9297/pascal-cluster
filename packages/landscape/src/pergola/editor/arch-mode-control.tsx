'use client'
import type { PergolaNode } from '../domain/schema'
import { pergolaArchMode } from '../domain/layout'

export function ArchModeControl({
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
      <span>Placement</span>
      <select
        aria-label="Full-width arch placement"
        value={pergolaArchMode(node)}
        onChange={(event) =>
          onUpdate({ archMode: event.target.value as NonNullable<PergolaNode['archMode']> })
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
        <option value="none">None</option>
        <option value="front">Front</option>
        <option value="back">Back</option>
        <option value="both">Both</option>
      </select>
    </label>
  )
}
