'use client'
import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { PanelSection, SliderControl, ToggleControl, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { TREE_KIND, TreeNode } from '../domain/schema'
import { TREE_SPECIES, treeControls } from '../domain/species'
// @ts-expect-error Vendored JavaScript has no TypeScript declarations.
import { ADVANCED_LEVEL_PARAMS, getSchema, SPECIES } from '../vendor/api/seedthree.js'

type Knob = { key?: string; path?: string; name: string; group?: string; default: number | boolean;
  min?: number; max?: number; step?: number; type?: 'bool' | 'color'; options?: Record<string, number> }
type TreeSchema = { name: string; latin: string; shape: Knob[]; advanced: Knob[];
  global: Knob[]; lod: Knob[]; generator: string }
const selectClass = 'max-w-[58%] rounded-md border border-border/50 bg-[#2C2C2E] px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30'

export default function TreePanel() {
  const levelId = useViewer((state) => state.selection.levelId)
  const active = useEditor((state) => state.tool === TREE_KIND)
  const defaults = useEditor((state) => state.toolDefaults[TREE_KIND])
  const selectedId = useViewer((state) => state.selection.selectedIds.length === 1
    ? state.selection.selectedIds[0] : undefined)
  const selectedRaw = useScene((state) => selectedId ? state.nodes[selectedId as AnyNodeId] : undefined)
  const selected = (selectedRaw?.type as string | undefined) === TREE_KIND
    ? TreeNode.parse(selectedRaw) : null
  const node = selected ?? TreeNode.parse(defaults ?? {})
  const speciesDefaults = treeControls(node.species)
  const schema = getSchema(node.species) as TreeSchema
  const advanced: Knob[] = schema.generator === 'weber-penn' && Number(node.controls.levels ?? SPECIES[node.species].params.levels) >= 4 &&
    !schema.advanced.some((knob) => knob.path?.endsWith('.3'))
    ? [...schema.advanced, ...ADVANCED_LEVEL_PARAMS.map((meta: { key: string; name: string;
      min: number; max: number; step: number; trunk: boolean; dflt: number }) => ({
        path: `paramOverrides.${meta.key}.3`, name: `${meta.name} · L3`,
        min: meta.min, max: meta.max, step: meta.step,
        default: SPECIES[node.species].params[meta.key]?.[3] ?? meta.dflt,
      }))]
    : schema.advanced
  const changeSpecies = (species: string) => {
    const patch = { species, controls: treeControls(species), lod: {} }
    if (selected) useScene.getState().updateNode(selected.id as AnyNodeId, patch as Partial<AnyNode>)
    else useEditor.getState().setToolDefaults(TREE_KIND, { ...defaults, ...patch })
  }
  const update = (field: 'controls' | 'lod', key: string, value: number | boolean) => {
    if (field === 'controls' && key.startsWith('paramOverrides.')) {
      const [, param, level] = key.split('.')
      if (!param || !level) return
      const current = node.controls.paramOverrides as Record<string, Record<string, number>> | undefined
      const controls = { ...node.controls, paramOverrides: {
        ...current, [param]: { ...current?.[param], [level]: value },
      } }
      if (selected) useScene.getState().updateNode(selected.id as AnyNodeId, { controls } as Partial<AnyNode>)
      else useEditor.getState().setToolDefaults(TREE_KIND, { ...defaults, controls })
      return
    }
    const patch = { ...node[field], [key]: value }
    if (selected) useScene.getState().updateNode(selected.id as AnyNodeId, { [field]: patch } as Partial<AnyNode>)
    else useEditor.getState().setToolDefaults(TREE_KIND, { ...defaults, [field]: patch })
  }
  const valueOf = (field: 'controls' | 'lod', knob: Knob) => {
    if (knob.path) {
      const [, param, level] = knob.path.split('.')
      const overrides = node.controls.paramOverrides as Record<string, Record<string, number>> | undefined
      return overrides?.[param ?? '']?.[level ?? ''] ?? knob.default
    }
    return node[field][knob.key ?? ''] ?? (field === 'controls' ? speciesDefaults[knob.key ?? ''] : undefined) ?? knob.default
  }
  const control = (field: 'controls' | 'lod', knob: Knob) => {
    const key = knob.path ?? knob.key ?? ''
    const value = valueOf(field, knob)
    if (knob.type === 'bool') return <ToggleControl key={key} label={knob.name}
      checked={Boolean(value)} onChange={(next) => update(field, key, next)} />
    if (knob.type === 'color') return <label key={key}
      className="flex min-h-9 items-center justify-between gap-3 border-b border-border/50 px-2 text-xs text-foreground/80">
      <span>{knob.name}</span><input type="color" aria-label={knob.name}
        value={`#${Number(value).toString(16).padStart(6, '0')}`}
        onChange={(event) => update(field, key, parseInt(event.currentTarget.value.slice(1), 16))} />
    </label>
    if (knob.options) return <label key={key}
      className="flex min-h-9 items-center justify-between gap-3 border-b border-border/50 px-2 text-xs text-foreground/80">
      <span>{knob.name}</span><select className={selectClass} value={Number(value)}
        onChange={(event) => update(field, key, Number(event.currentTarget.value))}>
        {Object.entries(knob.options).map(([label, option]) =>
          <option key={option} value={option}>{label}</option>)}
      </select>
    </label>
    const step = knob.step ?? 1
    return <SliderControl key={key} label={knob.name} value={Number(value)}
      min={knob.min ?? 0} max={knob.max ?? 1} step={step}
      precision={Math.max(0, Math.ceil(-Math.log10(step)))}
      onChange={(next) => update(field, key, next)} />
  }
  const start = () => {
    if (!levelId) return
    const editor = useEditor.getState()
    editor.setMode('build'); editor.setTool(TREE_KIND)
  }
  return <section aria-label="SeedThree tree settings" className="flex flex-col">
    <div className="px-2 pb-3">
      <label className="mb-2 flex items-center justify-between gap-2 text-xs text-foreground/80">
        <span>Species</span><select className={selectClass} value={node.species}
          onChange={(event) => changeSpecies(event.currentTarget.value)}>
          {TREE_SPECIES.map((species) => <option key={species.key} value={species.key}>{species.name}</option>)}
        </select>
      </label>
      <p className="mb-2 text-xs text-muted-foreground">{schema.latin} · SeedThree</p>
      {!selected && <button type="button" disabled={!levelId} onClick={start}
        className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
        {active ? 'Click in scene to place plant' : `Place ${schema.name}`}
      </button>}
    </div>
    <PanelSection title="Growth and placement">
      {schema.global.filter((knob) => knob.group === 'global').map((knob) => control('controls', knob))}
    </PanelSection>
    <PanelSection title="Plant shape">
      {schema.shape.map((knob) => control('controls', knob))}
    </PanelSection>
    <PanelSection title="Foliage and bark" defaultExpanded={false}>
      {schema.global.filter((knob) => knob.group === 'material').map((knob) => control('controls', knob))}
    </PanelSection>
    <PanelSection title="Advanced growth" defaultExpanded={false}>
      {advanced.map((knob) => control('controls', knob))}
    </PanelSection>
    <PanelSection title="LOD and performance" defaultExpanded={false}>
      {schema.lod.map((knob) => (knob.key === 'lod0Density' && schema.generator !== 'dichotomous-lsystem')
        ? <div key={knob.key} className="pointer-events-none opacity-50" title="Applies only to rosette species">
          {control('lod', knob)}
        </div> : control('lod', knob))}
    </PanelSection>
  </section>
}
