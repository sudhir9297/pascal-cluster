'use client'

import type { PathwayBorderStyle, PathwayNode } from '../domain/schema'

const options: { value: PathwayBorderStyle; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No raised or contrasting edge' },
  { value: 'stone', label: 'Stone edging', description: 'Individual stones along each side' },
  { value: 'smooth', label: 'Smooth edge', description: 'A continuous edging strip' },
]

export function PathwayBorderControl({ node, onUpdate }: {
  node: PathwayNode
  onUpdate: (patch: Partial<PathwayNode>) => void
}) {
  return <div role="group" aria-label="Path border" style={{ padding: '8px 12px' }}>
    <div style={{ fontSize: 12, marginBottom: 8 }}>Path border</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
      {options.map((option) => {
        const selected = (node.borderStyle ?? 'stone') === option.value
        return <button key={option.value} type="button" aria-pressed={selected} title={option.description}
          onClick={() => onUpdate({ borderStyle: option.value })}
          style={{ minWidth: 0, minHeight: 36, padding: '7px 6px', borderRadius: 6, cursor: 'pointer',
            border: `1px solid ${selected ? 'var(--ring)' : 'var(--border)'}`,
            background: selected ? 'var(--accent)' : 'transparent', color: 'var(--foreground)',
            fontSize: 12, lineHeight: 1.35, whiteSpace: 'normal' }}>
          {option.label}
        </button>
      })}
    </div>
  </div>
}
