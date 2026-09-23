'use client'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useScene } from '@pascal-app/core'
import { useEffect, useState } from 'react'
import { PATHWAY_KIND, PathwayNode } from '../domain/schema'
import { pathComponents } from '../domain/components'
import type { AnyNode, AnyNodeId } from '@pascal-app/core'
import { CatalogCard } from '../../editor/catalog-card'
import { PathwayIllustration } from './illustration'
import { sendPathwayCommand, usePathwayStatus } from './session'
import { drawingWidth, STONE_WALKWAY_PRESET } from '../domain/settings'

export function PathwayPanel() {
  const levelId = useViewer((s) => s.selection.levelId)
  const sceneNodes = useScene((s) => s.nodes)
  // Older scenes stored every route on the level in one node. Separate their
  // disconnected parts once so ordinary selection and Delete affect one item.
  useEffect(() => {
    if (!levelId) return
    const changes: { create: { node: AnyNode; parentId: AnyNodeId }[];
      update: { id: AnyNodeId; data: Partial<AnyNode> }[] } = { create: [], update: [] }
    for (const raw of Object.values(sceneNodes)) {
      if ((raw.type as string) !== PATHWAY_KIND || raw.parentId !== levelId) continue
      const node = PathwayNode.parse(raw)
      const parts = pathComponents(node)
      if (parts.length < 2) {
        if ((raw as { finish?: string }).finish === 'curvedCobbles')
          changes.update.push({ id: node.id as AnyNodeId,
            data: { finish: 'riverStones', borderStyle: 'none' } as Partial<AnyNode> })
        continue
      }
      changes.update.push({ id: node.id as AnyNodeId, data: parts[0] as Partial<AnyNode> })
      for (const part of parts.slice(1)) {
        const sibling = PathwayNode.parse({ ...node, id: undefined, ...part })
        changes.create.push({ node: sibling as unknown as AnyNode, parentId: levelId as AnyNodeId })
      }
    }
    if (changes.create.length || changes.update.length) useScene.getState().applyNodeChanges(changes)
  }, [levelId, sceneNodes])
  const active = useEditor((s) => s.tool === PATHWAY_KIND)
  const status = usePathwayStatus()
  const [mode, setMode] = useState<'straight' | 'curve'>('straight')
  useEffect(() => { if (active) setMode(status.mode) }, [active, status.mode])
  const [stonePreset, setStonePreset] = useState(false)
  const choose = (nextMode: 'straight' | 'curve', stone = false) => {
    if (!levelId) return
    if (active && mode === nextMode && stone === stonePreset) { sendPathwayCommand('cancel'); return }
    if (active) sendPathwayCommand('cancel')
    setMode(nextMode)
    setStonePreset(stone)
    const editor = useEditor.getState()
    const previous = editor.toolDefaults[PATHWAY_KIND]
    editor.setToolDefaults(PATHWAY_KIND, { ...previous,
      defaultWidth: drawingWidth(previous), cornerStyle: 'square',
      ...(stone ? STONE_WALKWAY_PRESET : {}), drawMode: nextMode })
    editor.setTool(PATHWAY_KIND)
  }
  return <section aria-label="Pathways and walkways">
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
      <CatalogCard label="Straight / polyline" active={active && !stonePreset && status.mode === 'straight'}
        disabled={!levelId} onClick={() => choose('straight')}>
        <PathwayIllustration curved={false} />
      </CatalogCard>
      <CatalogCard label="Smooth curve" active={active && !stonePreset && status.mode === 'curve'}
        disabled={!levelId} onClick={() => choose('curve')}>
        <PathwayIllustration />
      </CatalogCard>
      <CatalogCard label="Stone walkway · 1.8 m" active={active && stonePreset}
        disabled={!levelId} onClick={() => choose('curve', true)}>
        <PathwayIllustration paved />
      </CatalogCard>
    </div>
    <p role="status" style={{ color: 'var(--muted-foreground)', fontSize: 12, lineHeight: 1.5 }}>
      {!levelId ? 'Select a level to draw.' : active
        ? status.message || `${status.points} points. ${status.mode === 'curve'
          ? 'Click spline points, then press Enter or double-click to finish.'
          : 'Each click saves a straight leg. Press Enter or double-click to finish.'} Esc stops drawing.`
        : 'Choose a drawing preset. Select a finished walkway to open its floating settings.'}
    </p>
  </section>
}
