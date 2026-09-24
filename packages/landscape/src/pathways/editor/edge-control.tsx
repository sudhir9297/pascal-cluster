'use client'

import { pathwayEdgeProfiles, type PathwayEdgeProfile, type PathwayNode } from '../domain/schema'

export function PathwayEdgeControl({ node, onUpdate }: {
  node: PathwayNode
  onUpdate: (patch: Partial<PathwayNode>) => void
}) {
  const control = (label: string, key: 'stoneEdge' | 'borderEdge') => (
    <div role="group" aria-label={label} style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
        {pathwayEdgeProfiles.map((profile: PathwayEdgeProfile) => (
          <button key={profile} type="button" aria-pressed={(node[key] ?? 'soft') === profile}
            onClick={() => onUpdate({ [key]: profile })}
            style={{ minWidth: 0, minHeight: 34, padding: '6px 4px', borderRadius: 6, cursor: 'pointer',
              border: `1px solid ${(node[key] ?? 'soft') === profile ? 'var(--ring)' : 'var(--border)'}`,
              background: (node[key] ?? 'soft') === profile ? 'var(--accent)' : 'transparent', color: 'var(--foreground)',
              fontSize: 12, textTransform: 'capitalize' }}>
            {profile}
          </button>
        ))}
      </div>
    </div>
  )
  return <>
    {node.finish === 'laidStone' && control('Stone edges', 'stoneEdge')}
    {node.borderStyle !== 'none' && control('Border edges', 'borderEdge')}
  </>
}
