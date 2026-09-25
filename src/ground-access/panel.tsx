'use client'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { CatalogCard } from '../editor/catalog-card'
import { accessItems } from './shared/items'
import { PatioPanel } from './patio/editor/panel'
import { DeckPanel } from './deck/editor/panel'
import { SurfaceDrawingPanel } from './shared/drawing-panel'
import { isDrawnAccessKind } from './shared/items'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { EdgingNode, EDGING_KIND, edgingForms, type EdgingNode as Edging } from './edging/domain/schema'

export function GroundAccessPanel() {
  const levelId = useViewer((state) => state.selection.levelId)
  const active = useEditor((state) => state.tool)
  const retainingToolActive = useEditor((state) => state.tool === 'wall' &&
    (state.toolDefaults.wall?.metadata as { landscapeRetainingWall?: boolean } | undefined)?.landscapeRetainingWall === true)
  const retainingWallDefaults = useEditor((state) => state.toolDefaults['landscape:retaining-wall'])
  const selectedId = useViewer((state) => state.selection.selectedIds.length === 1
    ? state.selection.selectedIds[0] : undefined)
  const selectedNode = useScene((state) => selectedId ? state.nodes[selectedId as AnyNodeId] : undefined)
  const selectedType = selectedNode?.type as string | undefined
  const edgingDefaults = useEditor((state) => state.toolDefaults[EDGING_KIND])
  const selectedEdging = selectedType === EDGING_KIND && selectedNode ? EdgingNode.parse(selectedNode) : null
  const editingEdging = active === EDGING_KIND
  const edgingSettings = editingEdging ? EdgingNode.parse(edgingDefaults ?? {}) : selectedEdging
  const updateEdging = (patch: Partial<Edging>) => {
    if (editingEdging) {
      const editor = useEditor.getState()
      editor.setToolDefaults(EDGING_KIND, { ...editor.toolDefaults[EDGING_KIND], ...patch })
    } else if (selectedEdging) useScene.getState().updateNode(selectedEdging.id as AnyNodeId, patch as Partial<AnyNode>)
  }
  return <section aria-label="Ground and access">
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
      {accessItems.map((item) => {
        const kind = `landscape:${item.kind}`
        return <CatalogCard key={kind} label={item.label} disabled={!levelId}
          active={item.kind === 'retaining-wall' ? retainingToolActive : active === kind} onClick={() => {
            const editor = useEditor.getState()
            if (item.kind === 'retaining-wall') {
              editor.setPhase('structure')
              editor.setStructureLayer('elements')
              editor.armToolMode({ mode: 'build', tool: 'wall' })
              const metadata = editor.toolDefaults.wall?.metadata
              editor.setToolDefaults('wall', {
                ...editor.toolDefaults.wall,
                metadata: {
                  ...(metadata && typeof metadata === 'object' ? metadata : {}),
                  landscapeRetainingWall: true,
                  roomBoundary: false,
                },
                thickness: retainingWallDefaults?.depth ?? 0.25,
                height: retainingWallDefaults?.thickness ?? 0.9,
              })
              return
            }
            if (isDrawnAccessKind(kind) && active !== kind)
              editor.setToolDefaults(kind, { ...editor.toolDefaults[kind], shape: 'rectangle' })
            editor.setMode('build')
            editor.setTool(kind)
          }}>
          <svg viewBox="0 0 100 100" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
            <path d="M14 48 51 28 87 47 49 68Z" fill={item.color} stroke="#665b4d" strokeWidth="2" />
            <path d="M14 48v10l35 20V68M87 47v11L49 78" fill="none" stroke="#665b4d" strokeWidth="2" />
          </svg>
        </CatalogCard>
      })}
      <CatalogCard label="Stairs" disabled={!levelId} active={active === 'stair'} onClick={() => {
        const editor = useEditor.getState()
        editor.setPhase('structure')
        editor.setStructureLayer('elements')
        editor.setToolDefaults('stair', { railingMode: 'none' })
        editor.armToolMode({ mode: 'build', tool: 'stair' })
      }}>
        <svg viewBox="0 0 100 100" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
          <path d="M13 68 35 57 35 48 57 37 57 28 81 16 87 21 87 49 64 61 64 70 42 81 42 90 13 76Z"
            fill="#b6aaa0" stroke="#665b4d" strokeWidth="2" />
          <path d="M13 68 42 82 64 71 87 59M35 57 64 71M57 37 87 50" fill="none" stroke="#665b4d" strokeWidth="2" />
        </svg>
      </CatalogCard>
    </div>
    {(active === 'landscape:patio' || (!isDrawnAccessKind(active ?? '') && selectedType === 'landscape:patio')) && <PatioPanel />}
    {(active === 'landscape:deck' || (!isDrawnAccessKind(active ?? '') && selectedType === 'landscape:deck')) && <DeckPanel />}
    {(['landscape:concrete-slab', 'landscape:landing'] as const).map((kind) =>
      (active === kind || (!isDrawnAccessKind(active ?? '') && selectedType === kind)) &&
        <SurfaceDrawingPanel key={kind} kind={kind} />)}
    {(active === EDGING_KIND || selectedType === EDGING_KIND) && <div style={{ padding: '12px 0' }}>
      <div style={{ fontSize: 12, marginBottom: 7 }}>Edging shape</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, marginBottom: 12 }}>
        {edgingForms.map((form) => <button key={form} type="button" aria-pressed={edgingSettings?.form === form}
          style={{ padding: '7px 4px', border: '1px solid var(--border)', borderRadius: 6,
            background: edgingSettings?.form === form ? 'var(--accent)' : 'transparent', cursor: 'pointer', fontSize: 11 }}
          onClick={() => updateEdging({ form,
            ...(edgingSettings?.thickness === 0.18 && (form === 'capped-wall' || form === 'square-posts' || form === 'round-posts')
              ? { thickness: form === 'capped-wall' ? 0.6 : form === 'square-posts' ? 0.45 : 0.3 } : {}),
            ...(form === 'stone' && edgingSettings?.irregularity === 0.2 ? { irregularity: 0.75 } : {}),
            ...(form === 'square-posts' && edgingSettings?.form !== 'square-posts' ? { postHeightPattern: 'staggered' as const } : {}),
            ...(form === 'round-posts' && edgingSettings?.form !== 'round-posts' ? { postHeightPattern: 'even' as const } : {}),
          })}>
          {{ strip: 'Strip', pavers: 'Pavers', stone: 'Stone', 'square-posts': 'Square posts',
            'round-posts': 'Round posts', 'capped-wall': 'Capped wall' }[form]}
        </button>)}
      </div>
      {edgingSettings?.form === 'pavers' && <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, marginBottom: 6 }}>Paver pattern</div>
        {(['separated', 'woven'] as const).map((layout) => <button key={layout} type="button"
          aria-pressed={edgingSettings.layout === layout}
          style={{ marginRight: 6, padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 6,
            background: edgingSettings.layout === layout ? 'var(--accent)' : 'transparent' }}
          onClick={() => updateEdging({ layout })}>
          {layout === 'separated' ? 'Separated' : 'Woven'}
        </button>)}
      </div>}
      {(edgingSettings?.form === 'square-posts' || edgingSettings?.form === 'round-posts') && <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, marginBottom: 6 }}>Post heights</div>
        {(['even', 'staggered'] as const).map((pattern) => <button key={pattern} type="button"
          aria-pressed={edgingSettings.postHeightPattern === pattern}
          style={{ marginRight: 6, padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 6,
            background: edgingSettings.postHeightPattern === pattern ? 'var(--accent)' : 'transparent' }}
          onClick={() => updateEdging({ postHeightPattern: pattern })}>
          {pattern === 'even' ? 'Even' : 'Staggered'}
        </button>)}
      </div>}
      {edgingSettings?.form === 'capped-wall' && <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {([{ key: 'capOverhang', label: 'Cap overhang' }, { key: 'capThickness', label: 'Cap thickness' }] as const)
          .map(({ key, label }) => <label key={key} style={{ flex: 1, fontSize: 11 }}>{label} (m)
            <input type="number" min={key === 'capThickness' ? 0.02 : 0} max={0.3} step={0.01}
              value={edgingSettings[key]} onChange={(event) => {
                const value = Number(event.target.value)
                if (Number.isFinite(value)) updateEdging({ [key]: value })
              }} style={{ display: 'block', width: '100%', marginTop: 4 }} />
          </label>)}
      </div>}
      <div style={{ fontSize: 12, marginBottom: 7 }}>Edging drawing</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['straight', 'curve', 'freehand'] as const).map((mode) => {
          const defaults = useEditor.getState().toolDefaults[EDGING_KIND]
          const selected = selectedType === EDGING_KIND && selectedNode
            ? EdgingNode.parse(selectedNode) : null
          const current = selected && active !== EDGING_KIND ? selected.drawMode : defaults?.drawMode ?? 'straight'
          return <button key={mode} type="button" aria-pressed={current === mode}
            style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6,
              background: current === mode ? 'var(--accent)' : 'transparent', cursor: 'pointer' }}
            onClick={() => {
              if (selected && active !== EDGING_KIND) {
                useScene.getState().updateNode(selected.id as AnyNodeId, { drawMode: mode } as Partial<AnyNode>)
              } else {
                const editor = useEditor.getState()
                editor.setToolDefaults(EDGING_KIND, { ...editor.toolDefaults[EDGING_KIND], drawMode: mode })
              }
            }}>{mode === 'curve' ? 'Smooth curve' : mode === 'freehand' ? 'Freehand' : 'Straight'}</button>
        })}
      </div>
      <p style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
        {active === EDGING_KIND && (useEditor.getState().toolDefaults[EDGING_KIND]?.drawMode === 'freehand'
          ? 'Drag to draw; press T to switch or Enter to finish.' : 'Click points; press T to switch or Enter to finish.')}
      </p>
    </div>}
  </section>
}
