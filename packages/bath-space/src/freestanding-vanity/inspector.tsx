'use client'
import {
  PanelSection,
  PanelWrapper,
  ToggleControl,
  PanelSelect,
} from '../inspector-controls'

import { SectionSizingProvider } from '../section/sizing-mode'
import { VanitySliderControl as SliderControl } from './size-controls'
import { SectionAccordion } from '../section/section-card'
import { vanitySection } from '../section/model'
import type { AnyNode, AnyNodeId, ParamField } from '@pascal-app/core'
import { useScene } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { VanityNode, WallMountedVanityNode, WALL_MOUNTED_VANITY } from './schema'
import { vanityOptionLabels, vanityParameterGroups } from './parametrics'
import { vanityPresets } from './presets'
import { customBaysFromLayout } from './layout'
import { CustomStorageEditor } from './storage-editor'
import { cancelVanityAnimation } from './interaction'
import { wallVanityPlacement } from './wall-placement'
import { useDrawerClearanceStatus } from './drawer-clearance-status'

const integerFields = new Set(['drawerRows', 'drawerColumns', 'doorCount', 'interiorShelves'])

export default function FreestandingVanityInspector({ node: rawNode }: { node: VanityNode }) {
  const setSelection = useViewer((state) => state.setSelection)
  const node = VanityNode.parse(rawNode)
  const clearanceStatus = useDrawerClearanceStatus(node.id)
  const wallMounted = node.type === WALL_MOUNTED_VANITY
  const host = useScene((state) =>
    wallMounted ? state.nodes[(node.wallId ?? node.parentId) as AnyNodeId] : undefined,
  )
  const wallLength =
    host?.type === 'wall'
      ? Math.hypot(host.end[0] - host.start[0], host.end[1] - host.start[1])
      : null
  const activePreset = vanityPresets.find((preset) =>
    Object.entries(preset.settings).every(
      ([key, value]) => node[key as keyof VanityNode] === value,
    ),
  )
  const prepare = (patch: Partial<VanityNode>): Partial<VanityNode> => {
    if (wallMounted) {
      const next = { ...node, ...patch }
      patch.mountingHeight = Math.min(
        next.mountingHeight,
        next.height - (next.countertopEnabled ? next.countertopThickness : 0) - 0.2,
      )
      if (host?.type === 'wall') {
        const placed = wallVanityPlacement(
          WallMountedVanityNode.parse({ ...next, mountingHeight: patch.mountingHeight }),
          host,
          next.position[0],
          node.side,
          0,
          true,
        )
        if (!placed) return {}
        patch = { ...patch, ...placed }
      }
    }
    return patch
  }
  const update = (patch: Partial<VanityNode>) => {
    patch = prepare(patch)
    if (
      [
        'storageLayout',
        'storageBays',
        'drawerRows',
        'drawerColumns',
        'doorCount',
        'drawerType',
      ].some((key) => key in patch)
    ) {
      patch = { ...patch, partOpenings: {}, drawerOpen: 0, doorOpen: 0 }
      cancelVanityAnimation(node.id as AnyNodeId)
    } else if ('drawerOpen' in patch || 'doorOpen' in patch) {
      cancelVanityAnimation(node.id as AnyNodeId)
      patch.partOpenings = Object.fromEntries(
        Object.entries(node.partOpenings).filter(
          ([id]) =>
            !('drawerOpen' in patch && id.startsWith('vanity-drawer-')) &&
            !('doorOpen' in patch && id.startsWith('vanity-door-')),
        ),
      )
    }
    VanityNode.parse({ ...node, ...patch })
    useScene.getState().updateNode(node.id as AnyNodeId, patch as Partial<AnyNode>)
  }

  function fieldControl(field: ParamField<VanityNode>) {
    if (field.visibleIf && !field.visibleIf(node)) return null
    const key = field.key as keyof VanityNode
    const label =
      wallMounted && key === 'height' ? 'Top height from floor' : (field.label ?? String(key))
    if (field.kind === 'number') {
      const percent = key === 'drawerOpen'
      const multiplier = percent ? 100 : 1
      const elevation =
        wallMounted && (key === 'height' || key === 'mountingHeight') ? node.position[1] : 0
      const step = (field.step ?? 1) * multiplier
      const maximum =
        key === 'mountingHeight'
          ? Math.min(
              0.4,
              node.height - (node.countertopEnabled ? node.countertopThickness : 0) - 0.2,
            )
          : key === 'width' && wallLength !== null
            ? Math.min(
                1.8,
                Math.max(
                  0.55,
                  wallLength - (node.countertopEnabled ? node.countertopOverhang * 2 : 0),
                ),
              )
            : key === 'countertopOverhang' && wallLength !== null
              ? Math.min(0.05, Math.max(0, (wallLength - node.width) / 2))
              : (field.max ?? 100)
      return (
        <SliderControl
          node={node}
          dimensionKey={String(key)}
          elevation={elevation}
          key={key}
          label={label}
          value={(Number(node[key]) + elevation) * multiplier}
          min={Math.max(0, (field.min ?? 0) + elevation) * multiplier}
          max={(maximum + elevation) * multiplier}
          step={step}
          precision={integerFields.has(key) || step >= 1 ? 0 : Math.ceil(-Math.log10(step))}
          unit={percent ? '%' : field.unit}
          onChange={(value) =>
            update({
              [key]: integerFields.has(key) ? Math.round(value) : value / multiplier - elevation,
            })
          }
        />
      )
    }
    if (field.kind === 'enum')
      return (
        <label
          key={key}
          className="flex min-h-9 items-center justify-between gap-3 px-3 py-1.5 text-xs text-foreground/80"
        >
          <span className="shrink-0">{label}</span>
          <PanelSelect
            aria-label={label}
            value={String(node[key])}
            className="h-7 min-w-0 max-w-[60%] rounded-md border border-border/50 bg-secondary px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
            onChange={(event) =>
              update(
                key === 'storageLayout' && event.target.value === 'custom'
                  ? {
                      storageLayout: 'custom',
                      storageBays: node.storageBays.length
                        ? node.storageBays
                        : customBaysFromLayout(node),
                    }
                  : { [key]: event.target.value },
              )
            }
          >
            {field.options.map((value) => (
              <option key={value} value={value}>
                {key === 'countertopEdge' && value === 'square'
                  ? 'Square edge'
                  : (vanityOptionLabels[value] ?? value.charAt(0).toUpperCase() + value.slice(1))}
              </option>
            ))}
          </PanelSelect>
        </label>
      )
    if (field.kind === 'boolean')
      return (
        <ToggleControl
          key={key}
          label={label}
          checked={Boolean(node[key])}
          onChange={(checked) => update({ [key]: checked })}
        />
      )
    return null
  }

  return (
    <SectionSizingProvider key={node.id}><PanelWrapper
      title={wallMounted ? 'Wall-mounted Vanity' : 'Freestanding Vanity'}
      onClose={() => setSelection({ selectedIds: [] })}
      width={340}
    >
      <SectionAccordion
        node={node}
        model={(item) =>
          vanitySection(
            item,
            wallLength === null
              ? 1.8
              : Math.min(
                  1.8,
                  Math.max(
                    0.55,
                    wallLength - (item.countertopEnabled ? item.countertopOverhang * 2 : 0),
                  ),
                ),
          )
        }
        onChange={update}
        preparePreview={prepare}
      />
      {clearanceStatus && (
        <p role="status" className="rounded-md bg-accent p-3 text-xs leading-relaxed">
          {clearanceStatus}
        </p>
      )}
      <div className="border-b border-border/50 px-3 pb-3">
        <label className="flex items-center justify-between gap-3 text-xs text-foreground/80">
          <span>Design</span>
          <PanelSelect
            aria-label="Vanity design"
            value={activePreset?.id ?? 'custom'}
            className="h-8 w-40 rounded-md border border-border/50 bg-secondary px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
            onChange={(event) => {
              const preset = vanityPresets.find((item) => item.id === event.target.value)
              if (preset) update({ ...preset.settings, drawerOpen: 0, doorOpen: 0 })
            }}
          >
            <option value="custom" disabled>
              Custom
            </option>
            {vanityPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </PanelSelect>
        </label>
      </div>
      {vanityParameterGroups
        .filter((section) =>
          section.fields.some((field) => !field.visibleIf || field.visibleIf(node)),
        )
        .map((section) => (
          <PanelSection
            key={section.label}
            title={section.label}
            defaultExpanded={section.label === 'Dimensions' || section.label === 'Storage'}
          >
            {section.fields.map(fieldControl)}
            {section.label === 'Storage' && node.storageLayout === 'custom' && (
              <CustomStorageEditor node={node} onChange={update} />
            )}
          </PanelSection>
        ))}

      <div className="flex items-center justify-between gap-3 px-3 py-3 text-xs text-muted-foreground">
        <span>Click a front to open it · E opens all</span>
        <kbd className="rounded border border-border/60 px-1.5 py-0.5 font-sans text-foreground/80">
          E
        </kbd>
      </div>
    </PanelWrapper></SectionSizingProvider>
  )
}
