'use client'

import { minBrushRadius, terrainFieldOf, useScene } from '@pascal-app/core'
import { sculptFieldForSite, useEditor } from '@pascal-app/editor'
import type { XRWandSettingRow, XRWandSettingsModel } from '../../../../xr/wand'

const VERBS = ['raise', 'lower', 'flatten', 'smooth'] as const

export function usePascalXRWandTerrainModel(): XRWandSettingsModel {
  const verb = useEditor((state) => state.terrainVerb)
  const brush = useEditor((state) => state.terrainBrush)
  const flattenTarget = useEditor((state) => state.terrainFlattenTarget)
  const sampling = useEditor((state) => state.terrainSampling)
  const rootId = useScene((state) => state.rootNodeIds[0])
  const siteNode = useScene((state) => rootId ? state.nodes[rootId] : undefined)
  const site = siteNode?.type === 'site' ? siteNode : null
  const field = site ? terrainFieldOf(site) ?? sculptFieldForSite(site) : null
  const minimumRadius = field ? minBrushRadius(field) : 0.1
  const rows: XRWandSettingRow[] = [
    { id: 'terrain-verb', kind: 'cycle', label: 'Sculpt', value: verb,
      next: () => useEditor.getState().setTerrainVerb(VERBS[(VERBS.indexOf(verb) + 1) % VERBS.length]!),
      previous: () => useEditor.getState().setTerrainVerb(VERBS[(VERBS.indexOf(verb) + VERBS.length - 1) % VERBS.length]!),
    },
    { id: 'terrain-radius', kind: 'stepper', label: 'Brush size', min: minimumRadius, max: 100, step: 0.5, unit: 'm', value: brush.radius,
      onChange: (radius) => useEditor.getState().setTerrainBrush({ radius }) },
    { id: 'terrain-strength', kind: 'stepper', label: 'Strength', min: 0.05, max: 1, step: 0.05, value: brush.strength,
      onChange: (strength) => useEditor.getState().setTerrainBrush({ strength }) },
    { id: 'terrain-falloff', kind: 'stepper', label: 'Softness', min: 0, max: 1, step: 0.05, value: brush.falloff,
      onChange: (falloff) => useEditor.getState().setTerrainBrush({ falloff }) },
    { id: 'terrain-shape', kind: 'choice', label: 'Brush shape', value: brush.shape,
      onSelect: () => useEditor.getState().setTerrainBrush({ shape: brush.shape === 'round' ? 'square' : 'round' }) },
  ]
  if (verb === 'flatten') rows.push(
    { id: 'terrain-target', kind: 'stepper', label: 'Target height', min: -50, max: 50, step: 0.1, unit: 'm', value: flattenTarget ?? 0,
      onChange: (height) => useEditor.getState().setTerrainFlattenTarget(height) },
    { id: 'terrain-sample', kind: 'choice', label: 'Pick ground height', value: sampling ? 'On' : 'Off',
      onSelect: () => useEditor.getState().setTerrainSampling(!sampling) },
  )
  rows.push({ id: 'terrain-clear', kind: 'action', label: 'Clear terrain', disabled: !site?.terrain,
    onSelect: () => { if (site) useScene.getState().updateNode(site.id, { terrain: undefined }) } })
  return { rows, title: 'Terrain', mark: `${rows.length} controls`, page: 0, pageCount: 1 }
}
