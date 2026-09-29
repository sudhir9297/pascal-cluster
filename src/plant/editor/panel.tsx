'use client'
import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { PanelSection, SliderControl, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { PLANT_PRESETS, PLANT_PRESET_BY_KEY } from '../domain/catalog'
import { PLANT_KIND, PlantNode } from '../domain/schema'

const selectClass = 'max-w-[65%] rounded-md border border-border/50 bg-[#2C2C2E] px-2 py-1 text-xs text-foreground'

export default function PlantPanel() {
  const levelId = useViewer((state) => state.selection.levelId)
  const active = useEditor((state) => state.tool === PLANT_KIND)
  const defaults = useEditor((state) => state.toolDefaults[PLANT_KIND])
  const selectedId = useViewer((state) => state.selection.selectedIds.length === 1 ? state.selection.selectedIds[0] : undefined)
  const selectedRaw = useScene((state) => selectedId ? state.nodes[selectedId as AnyNodeId] : undefined)
  const selected = (selectedRaw?.type as string | undefined) === PLANT_KIND ? PlantNode.parse(selectedRaw) : null
  const node = selected ?? PlantNode.parse(defaults ?? {})
  const preset = PLANT_PRESET_BY_KEY[node.preset]
  const procedural = preset?.source !== 'FABOTANIC'
  const update = (patch: Partial<PlantNode>) => {
    if (selected) useScene.getState().updateNode(selected.id as AnyNodeId, patch as Partial<AnyNode>)
    else useEditor.getState().setToolDefaults(PLANT_KIND, { ...defaults, ...patch })
  }
  const start = () => {
    if (!levelId) return
    const editor = useEditor.getState()
    editor.setMode('build'); editor.setTool(PLANT_KIND)
  }
  return <section aria-label="Plant settings" className="flex flex-col">
    <div className="px-2 pb-3">
      <label className="mb-2 flex items-center justify-between gap-2 text-xs text-foreground/80">
        <span>Plant</span><select className={selectClass} value={node.preset}
          onChange={(event) => update({ preset: event.currentTarget.value })}>
          {PLANT_PRESETS.map((item) => <option key={item.key} value={item.key}>{item.name} · {item.source}</option>)}
        </select>
      </label>
      <p className="mb-2 text-xs text-muted-foreground">{preset?.category} · {preset?.source}</p>
      {!selected && <button type="button" disabled={!levelId} onClick={start}
        className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
        {active ? 'Click in scene to place plant' : `Place ${preset?.name ?? 'plant'}`}
      </button>}
    </div>
    <PanelSection title="Plant shape">
      <SliderControl label="Size" value={node.scale} min={0.1} max={5} step={0.05} precision={2} onChange={(scale) => update({ scale })} />
      {procedural && <>
        <SliderControl label="Density" value={node.density} min={0.1} max={node.preset.startsWith('claude:') && preset?.form !== 'grass' ? 1 : 2} step={0.05} precision={2} onChange={(density) => update({ density })} />
        <SliderControl label="Variation" value={node.variation} min={0} max={1} step={0.05} precision={2} onChange={(variation) => update({ variation })} />
        <SliderControl label="Seed" value={node.seed} min={0} max={99999} step={1} precision={0} onChange={(seed) => update({ seed })} />
      </>}
    </PanelSection>
    <PanelSection title="Color" defaultExpanded={false}>
      <label className="flex min-h-9 items-center justify-between gap-3 border-b border-border/50 px-2 text-xs text-foreground/80">
        <span>Foliage tint</span><input type="color" value={node.tint ?? preset?.foliage ?? '#628b50'}
          onChange={(event) => update({ tint: event.currentTarget.value })} />
      </label>
    </PanelSection>
  </section>
}
