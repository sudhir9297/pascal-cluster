'use client'

import { pathwayFinishes, type PathwayNode } from '../domain/schema'
import { finishOptions } from '../rendering/finishes'

export function PathwayFinishControl({ node, onUpdate }: {
  node: PathwayNode
  onUpdate: (patch: Partial<PathwayNode>) => void
}) {
  return <div role="group" aria-label="Paving finish" style={{ padding: '8px 12px' }}>
    <div style={{ fontSize: 12, marginBottom: 8 }}>Paving finish</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
      {pathwayFinishes.map((finish) => {
        const option = finishOptions[finish]
        const selected = node.finish === finish
        return <button key={finish} type="button" aria-pressed={selected} title={option.description}
          onClick={() => onUpdate({ finish })}
          style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0,
            minHeight: 36, padding: '7px 8px', borderRadius: 6, cursor: 'pointer',
            border: `1px solid ${selected ? 'var(--ring)' : 'var(--border)'}`,
            background: selected ? 'var(--accent)' : 'transparent', color: 'var(--foreground)',
            fontSize: 12, lineHeight: 1.35, textAlign: 'left', whiteSpace: 'normal' }}>
          <span aria-hidden="true" style={{ width: 12, height: 12, flexShrink: 0,
            borderRadius: 3, background: option.color }} />
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{option.label}</span>
        </button>
      })}
    </div>
  </div>
}
