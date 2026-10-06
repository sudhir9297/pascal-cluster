'use client'

import {
  getMaterialsForCategory, toLibraryMaterialRef, toSceneMaterialRef, useScene,
  type AnyNode, type MaterialCategory, type PaintCapability,
} from '@pascal-app/core'
import { PanelSelect } from '../inspector-controls'

type Props = {
  node: AnyNode & { slots?: Record<string, string> }
  paint: PaintCapability
  role: string
  label: string
  ariaLabel: string
  defaultLabel: string
  categories: readonly MaterialCategory[]
}

/** Assign existing host materials through the same capability used by canvas painting. */
export function SlotFinishSelect({ node, paint, role, label, ariaLabel, defaultLabel, categories }: Props) {
  const materials = useScene(state => state.materials)
  const readOnly = useScene(state => state.readOnly)
  const choices = new Map<string, string>()
  for (const category of categories) {
    for (const item of getMaterialsForCategory(category)) choices.set(toLibraryMaterialRef(item.id), item.label)
  }
  for (const item of Object.values(materials)) choices.set(toSceneMaterialRef(item.id), item.name)
  const current = node.slots?.[role] ?? ''
  return <label className="flex items-center justify-between gap-3 px-3 text-xs">
    {label}
    <PanelSelect aria-label={ariaLabel} value={current} disabled={readOnly}
      onChange={event => paint.commit?.({ node, role, material: undefined, materialPreset: event.target.value || undefined })}>
      <option value="">{defaultLabel}</option>
      {current && !choices.has(current) && <option value={current}>Current finish</option>}
      {[...choices].map(([ref, name]) => <option key={ref} value={ref}>{name}</option>)}
    </PanelSelect>
  </label>
}
