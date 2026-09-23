'use client'
import { type LevelNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { PergolaNode, PERGOLA_KIND } from '../domain/schema'
import { PergolaIllustration } from './illustration'
import { CatalogCard } from '../../editor/catalog-card'

const roofOptions = [
  { label: 'Open-slat pergola', roofForm: 'flat' },
  { label: 'Single-slope pergola', roofForm: 'single-slope' },
  { label: 'Gable pergola', roofForm: 'gable' },
  { label: 'Curved pergola', roofForm: 'curved' },
] as const

export function PergolaPanel() {
  const selectedLevelId = useViewer((s) => s.selection.levelId)
  const selectedBuildingId = useViewer((s) => s.selection.buildingId)
  const placementLevelId = useScene((s) => {
    if (selectedLevelId && s.nodes[selectedLevelId]?.type === 'level') {
      return selectedLevelId
    }
    // Match the editor's building fallback, then prefer its ground floor.
    const building = selectedBuildingId
      ? s.nodes[selectedBuildingId]
      : Object.values(s.nodes).find((node) => node.type === 'building')
    const levels = Object.values(s.nodes).filter(
      (node): node is LevelNode =>
        node.type === 'level' && (!building || node.parentId === building.id),
    )
    return (
      levels.find((level) => level.level === 0)?.id ??
      levels.sort((a, b) => Math.abs(a.level) - Math.abs(b.level))[0]?.id ??
      null
    )
  })
  const active = useEditor((s) => s.tool === PERGOLA_KIND)
  const activeRoofForm = useEditor((s) => s.toolDefaults[PERGOLA_KIND]?.roofForm)
  const place = (roofForm: (typeof roofOptions)[number]['roofForm']) => {
    const editor = useEditor.getState()
    if (!placementLevelId) return
    const level = useScene.getState().nodes[placementLevelId]
    const building = level?.parentId
      ? useScene.getState().nodes[level.parentId as AnyNodeId]
      : undefined
    useViewer.getState().setSelection({
      ...(building?.type === 'building' ? { buildingId: building.id } : {}),
      levelId: placementLevelId,
    })
    const { id: _id, type: _type, ...defaults } = PergolaNode.parse({})
    editor.setToolDefaults(PERGOLA_KIND, { ...defaults, roofForm })
    editor.setMode('build')
    editor.setTool(PERGOLA_KIND)
  }
  return (
    <section aria-label="Pergola items">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
          gap: 8,
        }}
      >
        {roofOptions.map(({ label, roofForm }) => (
          <CatalogCard
            key={roofForm}
            label={label}
            active={active && activeRoofForm === roofForm}
            disabled={!placementLevelId}
            onClick={() => place(roofForm)}
          >
            <PergolaIllustration roofForm={roofForm} />
          </CatalogCard>
        ))}
      </div>
    </section>
  )
}
