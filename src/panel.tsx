'use client'
import HolderCatalog, { HolderPreview } from './toilet-paper-holder/catalog'
import {VanityPreview,PlacedVanityPreview} from './freestanding-vanity/preview'
import DividerCatalog, { DividerPreview } from './shower-divider/catalog'
import { SHOWER_DIVIDER } from './shower-divider/schema'
import {BATH_SHOWER} from './bath-shower/schema'
import {BATH_SCREEN} from './bath-screen/schema'
import ShowerKitCatalog from './shower-kit/catalog'
import ShowerAssemblyCatalog from './shower-assembly/catalog'
import WallSpoutCatalog, {WallSpoutPreview} from './wall-spout/catalog'
import BodyJetCatalog, {BodyJetPreview} from './body-jet/catalog'
import ShowerControlCatalog, {ShowerControlPreview} from './shower-control/catalog'
import ShowerHoseCatalog, { ShowerHosePreview } from './shower-hose/catalog'
import ShowerMountCatalog, { ShowerMountPreview } from './shower-mount/catalog'
import HandShowerCatalog, { HandShowerPreview } from './hand-shower/catalog'
import ShowerHeadCatalog, { ShowerHeadPreview } from './shower-head/catalog'
import FloorToiletCatalog, { ToiletPreview as FloorToiletPreview } from './floor-standing-toilet/catalog'
import ShowerArmCatalog, { ShowerArmPreview } from './shower-arm/catalog'

import { useViewer } from '@pascal-app/viewer'
import { useEditor } from '@pascal-app/editor'
import { useScene, type AnyNode } from '@pascal-app/core'
import { useState } from 'react'
import FlushPlateCatalog, { FlushPlatePreview } from './flush-control/catalog'
import ToiletCatalog, { ToiletPreview } from './wall-hung-toilet/catalog'
import { WALL_HUNG_TOILET, type WallHungToiletNode } from './wall-hung-toilet/schema'
import { FLOOR_STANDING_TOILET, type FloorStandingToiletNode } from './floor-standing-toilet/schema'
import BathCatalog, { BathPreview } from './bathtub/catalog'
import { BATH_DECK } from './bath-deck/schema'
import { BATHTUB } from './bathtub/schema'
import TapCatalog from './taps/catalog'
import { CatalogEmptyState } from './catalog-ui'
import { vanityPresets } from './freestanding-vanity/presets'
import { setVanityPlacementPreset, useVanityPlacementPreset } from './freestanding-vanity/placement-settings'
import { FREESTANDING_VANITY, WALL_MOUNTED_VANITY, CORNER_VANITY, type VanityNode } from './freestanding-vanity/schema'

import { COUNTERTOP_BASIN, UNDERMOUNT_BASIN, DROP_IN_BASIN, SEMI_RECESSED_BASIN, HALF_PEDESTAL_BASIN, FULL_PEDESTAL_BASIN, WALL_HUNG_BASIN, isBasinKind, isInsetBasinKind, basinPresets, halfPedestalBasinPresets, fullPedestalBasinPresets, semiRecessedBasinPresets, wallHungBasinPresets } from './countertop-basin/schema'
import { setBasinPlacementShape, useBasinPlacementShape, setWallBasinPlacementDesign, useWallBasinPlacementDesign } from './countertop-basin/placement-settings'

import { WallBasinPreview } from './wall-hung-basin/preview'

const countertopBasinThumbnail = new URL('./countertop-basin/assets/countertop-basin.png', import.meta.url).href
const countertopBasinShapeThumbnails = {
  round: countertopBasinThumbnail,
  oval: new URL('./countertop-basin/assets/countertop-basin-oval.png', import.meta.url).href,
  rectangle: new URL('./countertop-basin/assets/countertop-basin-rounded-rectangle.png', import.meta.url).href,
} as const
const undermountBasinShapeThumbnails = {
  round: new URL('./countertop-basin/assets/undermount-basin-round.png', import.meta.url).href,
  oval: new URL('./countertop-basin/assets/undermount-basin-oval.png', import.meta.url).href,
  rectangle: new URL('./countertop-basin/assets/undermount-basin-rounded-rectangle.png', import.meta.url).href,
} as const
const dropInBasinShapeThumbnails = {
  round: new URL('./countertop-basin/assets/drop-in-basin-round.png', import.meta.url).href,
  oval: new URL('./countertop-basin/assets/drop-in-basin-oval.png', import.meta.url).href,
  rectangle: new URL('./countertop-basin/assets/drop-in-basin-rounded-rectangle.png', import.meta.url).href,
} as const
const semiRecessedBasinShapeThumbnails = {
  round: new URL('./countertop-basin/assets/semi-recessed-basin-round.png', import.meta.url).href,
  oval: new URL('./countertop-basin/assets/semi-recessed-basin-oval.png', import.meta.url).href,
  rectangle: new URL('./countertop-basin/assets/semi-recessed-basin-rounded-rectangle.png', import.meta.url).href,
} as const
const wallHungBasinThumbnail = new URL('./wall-hung-basin/assets/sculpted.png', import.meta.url).href
const fullPedestalBasinThumbnail = new URL('./full-pedestal-basin/assets/classic-full-pedestal.png', import.meta.url).href
const squareFullPedestalBasinThumbnail = new URL('./full-pedestal-basin/assets/square-full-pedestal.png', import.meta.url).href
const taperedMonoblocBasinThumbnail = new URL('./full-pedestal-basin/assets/tapered-monobloc.png', import.meta.url).href
const halfPedestalBasinThumbnail = new URL('./half-pedestal-basin/assets/classic-half-pedestal.png', import.meta.url).href
const squareHalfPedestalBasinThumbnail = new URL('./half-pedestal-basin/assets/square-half-pedestal.png', import.meta.url).href
const integratedHalfPedestalBasinThumbnail = new URL('./half-pedestal-basin/assets/integrated-tapered-shroud.png', import.meta.url).href

function getBasinShapeThumbnail(kind: string | null, shape: 'round' | 'oval' | 'rectangle') {
  if (kind === COUNTERTOP_BASIN) return countertopBasinShapeThumbnails[shape]
  if (kind === UNDERMOUNT_BASIN) return undermountBasinShapeThumbnails[shape]
  if (kind === DROP_IN_BASIN) return dropInBasinShapeThumbnails[shape]
  if (kind === SEMI_RECESSED_BASIN) return semiRecessedBasinShapeThumbnails[shape]
  return null
}

type VanityKind = typeof FREESTANDING_VANITY | typeof WALL_MOUNTED_VANITY | typeof CORNER_VANITY

function BasinPreview({ shape, wallHung = false, semiRecessed = false, pedestal = false, halfPedestal = false }: { shape: 'round' | 'oval' | 'rectangle'; wallHung?: boolean; semiRecessed?: boolean; pedestal?: boolean; halfPedestal?: boolean }) {
  if (pedestal || halfPedestal) return <svg aria-hidden="true" viewBox="0 0 88 80" className="h-full w-full p-3 text-foreground/85" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d={halfPedestal ? shape === 'round' ? 'M22 19h44L58 56H30Z' : shape === 'rectangle' ? 'M30 30h28v26H30Z' : 'M31 30h26l-4 23q-9 8-18 0Z' : shape === 'round' ? 'M22 19h44L57 72H31Z' : shape === 'rectangle' ? 'M32 30h24v42H32Z' : 'M35 29h18l4 43H31Z'} fill="currentColor" fillOpacity="0.06" />
    <path d={shape === 'rectangle' ? 'M12 12h64v12q0 10-32 10T12 24Z' : 'M12 19q0-8 32-8t32 8q0 16-32 16T12 19Z'} fill="currentColor" fillOpacity="0.06" />
    <ellipse cx="44" cy="19" rx="25" ry="6" /><ellipse cx="44" cy="13" rx="2" ry="1" />
  </svg>
  if (semiRecessed) return <svg aria-hidden="true" viewBox="0 0 88 64" className="h-full w-full p-3 text-foreground/85" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d={shape === 'rectangle' ? 'M12 17q0-5 6-5h52q6 0 6 5v25q0 9-9 9H21q-9 0-9-9Z' : 'M15 17q0-5 7-5h44q7 0 7 5v18q0 17-29 17T15 35Z'} fill="currentColor" fillOpacity="0.06" />
    <path d={shape === 'rectangle' ? 'M17 24q0-3 4-3h46q4 0 4 3v9q0 7-7 7H24q-7 0-7-7Z' : 'M21 24q0-3 23-3t23 3q0 16-23 16T21 24Z'} />
    <ellipse cx="44" cy="17" rx="2.5" ry="1.5" /><ellipse cx="44" cy="33" rx="3" ry="1.5" />
  </svg>
  return <svg aria-hidden="true" viewBox="0 0 88 64" className="h-full w-full p-3 text-foreground/85" fill="none" stroke="currentColor" strokeWidth="1.5">
    {wallHung && <path d="M9 7v47M9 16h67v8M13 16v8" strokeOpacity="0.65" />}
    {shape === 'rectangle' ? <><path d="M13 21q0-7 8-7h46q8 0 8 7v18q0 9-9 9H22q-9 0-9-9Z" fill="currentColor" fillOpacity="0.06"/><rect x="17" y="17" width="54" height="17" rx="7" /></>
      : <><path d={shape === 'round' ? 'M21 25q0 25 23 25t23-25' : 'M11 25q3 23 33 23t33-23'} fill="currentColor" fillOpacity="0.06" /><ellipse cx="44" cy="25" rx={shape === 'round' ? 23 : 33} ry="12" /><ellipse cx="44" cy="25" rx={shape === 'round' ? 19 : 29} ry="8" /></>}
    <ellipse cx="44" cy="28" rx="3" ry="1.5" />
  </svg>
}

function PlacedPreview({ node }: { node: AnyNode }) {
  const type = String(node.type)
  if (type === SHOWER_DIVIDER) return <DividerPreview columns={'columns' in node ? Number(node.columns) : 1} rows={'rows' in node ? Number(node.rows) : 1} />
  if (type.includes('wall-spout')) return <WallSpoutPreview />
  if (type.includes('body-jet')) return <BodyJetPreview />
  if (type.includes('shower-control')) return <ShowerControlPreview />
  if (type.includes('shower-hose')) return <ShowerHosePreview />
  if (type.includes('hand-shower')) return <HandShowerPreview />
  if (type.includes('shower-mount')) return <ShowerMountPreview />
  if (type.includes('shower-head')) return <ShowerHeadPreview />
  if (type.includes('shower-arm')) return <ShowerArmPreview />
  if (type === BATHTUB) return <BathPreview />
  if (type.includes('toilet-paper-holder')) return <HolderPreview shape={'shape' in node && typeof node.shape === 'string' ? node.shape : undefined} />
  if (type.includes('flush-')) return <FlushPlatePreview shape={'shape' in node && typeof node.shape === 'string' ? node.shape : undefined} />
  if (type === FLOOR_STANDING_TOILET) return <FloorToiletPreview design={(node as unknown as FloorStandingToiletNode).design} />
  if (type === WALL_HUNG_TOILET) return <ToiletPreview style={(node as unknown as WallHungToiletNode).style} />
  if (type.includes('vanity')) return <PlacedVanityPreview node={node as unknown as VanityNode} />
  if (type.includes('basin')) return <BasinPreview shape="oval" wallHung={type.includes('wall-hung')} pedestal={type.includes('full-pedestal')} halfPedestal={type.includes('half-pedestal')} />
  return <svg aria-hidden="true" viewBox="0 0 88 64" className="h-full w-full p-4 text-foreground/85" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M43 51V25c0-8 4-13 9-13s9 5 9 13v26M39 51h26M52 12V8m5 4V8" />
  </svg>
}

function PlacedItemCard({ node }: { node: AnyNode }) {
  const selected = useViewer(state => state.selection.selectedIds.includes(node.id))
  const type = String(node.type)
  const label = node.name || type.replace('bath-space:', '').replaceAll('-', ' ')
  return <button type="button" aria-label={`Select ${label}`} aria-pressed={selected}
    onClick={() => { useEditor.getState().setTool(null); useViewer.getState().setSelection({ selectedIds: [node.id] }) }}
    className={`overflow-hidden rounded-lg border bg-secondary/40 text-left focus-visible:outline-2 focus-visible:outline-ring ${selected ? 'border-primary' : 'border-border hover:bg-accent/30'}`}>
    <div style={{ aspectRatio: '7 / 4' }} className="flex items-center justify-center bg-background/40">
      <PlacedPreview node={node} />
    </div>
    <div style={{ minHeight: 32 }} className="px-2 py-1">
      <div className="truncate text-xs font-medium leading-4 text-foreground">{label}</div>
    </div>
  </button>
}

export default function BathSpacePanel() {
  const activeTool = useEditor((state) => state.tool)
  const setTool = useEditor((state) => state.setTool)
  const nodes = useScene((state) => state.nodes)
  const presetId = useVanityPlacementPreset()
  const basinShape = useBasinPlacementShape()
  const wallDesign = useWallBasinPlacementDesign()
  const placingBasin = isBasinKind(activeTool ?? "")
  const [basinKind, setBasinKind] = useState<string>(COUNTERTOP_BASIN)
  const [basinCategoryOpen, setBasinCategoryOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Basin')
  const [activeTab, setActiveTab] = useState<'All' | 'Placed'>('All')
  const currentBasinKind = basinCategoryOpen ? basinKind : placingBasin ? activeTool : basinKind
  const halfPedestal = currentBasinKind === HALF_PEDESTAL_BASIN
  const fullPedestal = currentBasinKind === FULL_PEDESTAL_BASIN
  const wallHung = currentBasinKind === WALL_HUNG_BASIN
  const inset = isInsetBasinKind(currentBasinKind ?? "")
  const [selectedKind, setSelectedKind] = useState<VanityKind>(FREESTANDING_VANITY)
  const [expandedVanityKind, setExpandedVanityKind] = useState<VanityKind | null>(null)
  const placing = activeTool === FREESTANDING_VANITY || activeTool === WALL_MOUNTED_VANITY || activeTool === CORNER_VANITY
  const kind = expandedVanityKind ?? (placing ? activeTool as VanityKind : selectedKind)
  const wallMounted = kind === WALL_MOUNTED_VANITY
  const corner = kind === CORNER_VANITY
  const placingKind = placing && activeTool === kind
  const vanityCategories = [
    { value: FREESTANDING_VANITY, label: 'Freestanding', description: 'Floor-standing vanities' },
    { value: WALL_MOUNTED_VANITY, label: 'Wall-mounted', description: 'Floating wall vanities' },
    { value: CORNER_VANITY, label: 'Corner', description: 'Angled front vanities for 90° corners' },
  ] as const
  const basinCategories = [
    { label: 'Countertop', description: 'Vessel basin', value: COUNTERTOP_BASIN },
    { label: 'Undermount', description: 'Below the counter', value: UNDERMOUNT_BASIN },
    { label: 'Drop-in', description: 'Rim sits on counter', value: DROP_IN_BASIN },
    { label: 'Semi-recessed', description: 'Projects from counter', value: SEMI_RECESSED_BASIN },
    { label: 'Wall hung', description: 'Mounted to a wall', value: WALL_HUNG_BASIN },
    { label: 'Full pedestal', description: 'Wall attached, floor standing', value: FULL_PEDESTAL_BASIN },
    { label: 'Half pedestal', description: 'Wall mounted with a short shroud', value: HALF_PEDESTAL_BASIN },
  ] as const
  const search = query.trim().toLowerCase()
  const matches = (text: string) => !search || text.toLowerCase().includes(search)
  const placedItems = Object.values(nodes).filter((node) => {
    const type = String(node.type)
    if (!type.startsWith('bath-space:')) return false
    if (activeCategory === 'Vanity') return type.includes('vanity')
    if (activeCategory === 'Basin') return type.includes('basin')
    if (activeCategory === 'Taps') return type.includes('tap')
    if (activeCategory === 'Shower') return (type.includes('shower') || type.includes('wall-spout') || type.includes('body-jet'))
    if (activeCategory === 'Bath') return type === BATHTUB || type === BATH_DECK || type === BATH_SCREEN || type === BATH_SHOWER
    if (activeCategory === 'Toilet') return type.includes('toilet') || type.includes('flush-')
    return false
  })
  const visibleVanityCategories = vanityCategories.filter((category) =>
    (matches(`vanity ${category.label} ${category.description}`) ||
    (category.value !== CORNER_VANITY && vanityPresets.some((preset) => matches(`${preset.label} ${preset.description}`)))))
  const visibleVanityPresets = vanityPresets.filter((preset) => matches(`${preset.label} ${preset.description}`))
  const visibleBasinCategories = basinCategories.filter((category) => (matches(`basin ${category.label} ${category.description}`) ||
    (category.value === HALF_PEDESTAL_BASIN ? halfPedestalBasinPresets : category.value === FULL_PEDESTAL_BASIN ? fullPedestalBasinPresets : category.value === WALL_HUNG_BASIN ? wallHungBasinPresets : category.value === SEMI_RECESSED_BASIN ? semiRecessedBasinPresets : basinPresets).some((preset) => matches(preset.label)))
  )
  const visibleWallBasinPresets = wallHungBasinPresets.filter(preset => matches(`${preset.label} ${preset.description}`))
  const visibleBasinPresets = (halfPedestal ? halfPedestalBasinPresets : fullPedestal ? fullPedestalBasinPresets : currentBasinKind === SEMI_RECESSED_BASIN ? semiRecessedBasinPresets : basinPresets)
    .filter((preset) => matches(preset.label))

  return (
    <div className="flex h-full min-h-0 flex-col">
    <header className="shrink-0 px-4 pb-3 pt-4">
      <div className="mb-4">
        <h1 className="text-sm font-semibold text-foreground">Bathroom</h1>
      </div>
      <label style={{ height: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--secondary)', color: 'var(--muted-foreground)' }}>
        <svg viewBox="0 0 24 24" aria-hidden="true" width="17" height="17" style={{ width: 17, height: 17, flex: '0 0 17px' }} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.2 4.2" /></svg>
        <input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search items" aria-label="Search bathroom fixtures" style={{ width: '100%', minWidth: 0, flex: 1, border: 0, outline: 0, padding: 0, background: 'transparent', color: 'var(--foreground)', font: 'inherit', fontSize: 12 }} />
      </label>
      <div role="tablist" aria-label="Bathroom catalog filter" className="mt-3 grid grid-cols-2 border-b border-border" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {(['All', 'Placed'] as const).map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab}
          onClick={() => setActiveTab(tab)} type="button"
          className={`border-b-2 px-2 py-2 text-xs font-medium transition-colors ${activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          {tab}{tab === 'Placed' && <span style={{ display: 'inline-block', marginLeft: 8 }}>{placedItems.length}</span>}
        </button>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Bathroom fixture categories">
        {['Vanity', 'Basin', 'Toilet', 'Shower', 'Bath', 'Taps'].map((category) => <button key={category} type="button"
          aria-pressed={activeCategory === category} onClick={() => { setActiveCategory(category); setBasinCategoryOpen(false); setExpandedVanityKind(null); setQuery('') }}
          className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${activeCategory === category ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary/40 text-foreground hover:bg-accent/40'}`}>
          {category}
        </button>)}
      </div>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
      {activeTab === 'Placed' ? <div className="pt-2">
        {placedItems.length ? <details open className="group border-t border-border/60 pt-2">
          <summary className="mb-2 flex h-7 cursor-pointer list-none items-center justify-between text-xs font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            {activeCategory}
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4" /></svg>
          </summary>
          <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginRight: 11 }} aria-label="Placed bathroom fixtures">
            {placedItems.map((node) => <PlacedItemCard key={node.id} node={node} />)}
          </div>
        </details> : <CatalogEmptyState>No items placed yet.</CatalogEmptyState>}
      </div> : <>
      {activeCategory === 'Vanity' && (visibleVanityCategories.length > 0 || expandedVanityKind !== null) && <section className="pt-1">
        <details open className="group border-t border-border/60 pt-2">
          <summary className="mb-2 flex h-7 cursor-pointer list-none items-center justify-between text-xs font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            Vanity
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4" /></svg>
          </summary>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} aria-label="Vanity mounting type">
              {visibleVanityCategories.map(option => <div key={option.value} className="group relative">
                <button type="button" aria-pressed={placing && activeTool === option.value}
                  aria-expanded={expandedVanityKind === option.value}
                  onClick={() => { setSelectedKind(option.value); setExpandedVanityKind(expandedVanityKind === option.value ? null : option.value); setQuery('') }}
                  className={`w-full overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring ${placing && activeTool === option.value ? 'border-primary bg-accent/30 ring-1 ring-primary/50' : 'border-border bg-secondary/40 hover:bg-accent/30'}`}>
                  <span style={{ aspectRatio: '7 / 4' }} className="flex aspect-[7/4] items-center justify-center bg-background/40">
                    <VanityPreview design="shaker" wallMounted={option.value === WALL_MOUNTED_VANITY} corner={option.value === CORNER_VANITY} />
                  </span>
                  <span className="block min-h-[32px] px-2 py-1"><span className="block text-xs font-medium leading-4 text-foreground">{option.label}</span></span>
                </button>
              </div>)}
            </div>
            {expandedVanityKind !== null && <>
              <h3 className="px-1 text-xs font-medium text-foreground">{vanityCategories.find(option => option.value === kind)?.label}</h3>
          {corner ? <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} aria-label="Vanity style">
            <button type="button" aria-label="Add Angled front vanity" onClick={() => setTool(CORNER_VANITY)} aria-pressed={placingKind}
              className={`w-full overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring ${placingKind ? 'border-primary bg-accent/30 ring-1 ring-primary/50' : 'border-border bg-secondary/40 hover:bg-accent/30'}`}>
              <span style={{ aspectRatio: '7 / 4' }} className="flex aspect-[7/4] items-center justify-center bg-background/40">
                <VanityPreview corner />
              </span>
              <span style={{ minHeight: 32 }} className="block min-h-[32px] px-2 py-1.5 text-xs font-medium leading-4 text-foreground">Angled front</span>
            </button>
          </div> : <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} aria-label="Vanity style">
            {visibleVanityPresets.map((preset) => {
              const selected = presetId === preset.id
              return <button key={preset.id} type="button" aria-pressed={selected && placingKind}
                aria-label={`Add ${preset.label} vanity`} onClick={() => {
                  setVanityPlacementPreset(preset.id)
                  setTool(kind)
                }}
                className={`overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring ${selected && placingKind ? 'border-primary bg-accent/30 ring-1 ring-primary/50' : 'border-border bg-secondary/40 hover:bg-accent/30'}`}>
                <span aria-hidden="true" style={{ aspectRatio: '7 / 4' }} className="flex aspect-[7/4] items-center justify-center bg-background/40">
                  <VanityPreview design={preset.id} wallMounted={wallMounted} />
                </span>
                <span style={{ minHeight: 32 }} className="block min-h-[32px] px-2 py-1.5 text-xs font-medium leading-4 text-foreground">{preset.label}</span>
              </button>
            })}
          </div>}
          {!corner && visibleVanityPresets.length === 0 && <CatalogEmptyState>No vanity styles match "{query.trim()}".</CatalogEmptyState>}
            </>}
          </div>
          {placingKind && <p role="status" className="text-xs text-muted-foreground">
            {corner ? 'Click near a 90° corner.' : wallMounted ? 'Click a wall to place.' : 'Click to place.'} Esc to cancel.
          </p>}
        </details>
      </section>}
      {activeCategory === 'Basin' && (visibleBasinCategories.length > 0 || basinCategoryOpen) && <section className="pt-1">
        <details open className="group border-t border-border/60 pt-2">
        <summary className="mb-2 flex h-7 cursor-pointer list-none items-center justify-between text-xs font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          Basin
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4" /></svg>
        </summary>
        <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} aria-label="Basin mounting type">
          {visibleBasinCategories.map(option => <div key={option.value} className="group relative">
            <button type="button" aria-pressed={placingBasin && currentBasinKind === option.value}
              aria-expanded={basinCategoryOpen && basinKind === option.value}
              onClick={() => { setBasinCategoryOpen(basinCategoryOpen && basinKind === option.value ? false : true); setBasinKind(option.value); setQuery('') }}
              className={`w-full overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring ${placingBasin && currentBasinKind === option.value ? 'border-primary bg-accent/30 ring-1 ring-primary/50' : 'border-border bg-secondary/40 hover:bg-accent/30'}`}>
            <span style={{ aspectRatio: '7 / 4' }} className="flex aspect-[7/4] items-center justify-center bg-background/40">{option.value === WALL_HUNG_BASIN ? <img src={wallHungBasinThumbnail} alt="" loading="lazy" className="h-full w-full object-contain" /> : option.value === FULL_PEDESTAL_BASIN ? <img src={fullPedestalBasinThumbnail} alt="" loading="lazy" className="h-full w-full object-contain" /> : option.value === HALF_PEDESTAL_BASIN ? <img src={halfPedestalBasinThumbnail} alt="" loading="lazy" className="h-full w-full object-contain" /> : getBasinShapeThumbnail(option.value, 'round') ? <img src={getBasinShapeThumbnail(option.value, 'round')!} alt="" loading="lazy" style={{ transform: 'scale(1.28)' }} className="h-full w-full object-contain" /> : <BasinPreview shape="oval" semiRecessed={option.value === SEMI_RECESSED_BASIN} />}</span>
            <span className="block min-h-[32px] px-2 py-1"><span className="block text-xs font-medium leading-4 text-foreground">{option.label}</span></span>
            </button>

          </div>)}
        </div>
        {basinCategoryOpen && <>
          <h3 className="px-1 text-xs font-medium text-foreground">{[
            { label: 'Countertop', value: COUNTERTOP_BASIN }, { label: 'Undermount', value: UNDERMOUNT_BASIN },
            { label: 'Drop-in', value: DROP_IN_BASIN }, { label: 'Semi-recessed', value: SEMI_RECESSED_BASIN },
            { label: 'Wall hung', value: WALL_HUNG_BASIN }, { label: 'Full pedestal', value: FULL_PEDESTAL_BASIN }, { label: 'Half pedestal', value: HALF_PEDESTAL_BASIN },
          ].find(option => option.value === currentBasinKind)?.label}</h3>
          {wallHung ? <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} aria-label="Wall hung basin designs">
            {visibleWallBasinPresets.map(preset => {
              const selected = activeTool === WALL_HUNG_BASIN && wallDesign === preset.wallDesign
              return <button key={preset.wallDesign} type="button" aria-pressed={selected} aria-label={`Add ${preset.label} basin`}
                onClick={() => { setWallBasinPlacementDesign(preset.wallDesign); setTool(WALL_HUNG_BASIN) }}
                className={`overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring ${selected ? 'border-primary bg-accent/30 ring-1 ring-primary/50' : 'border-border bg-secondary/40 hover:bg-accent/30'}`}>
                <span style={{ aspectRatio: '7 / 4' }} className="flex aspect-[7/4] items-center justify-center bg-background/40"><img src={preset.thumbnail} alt="" width={720} height={540} loading="lazy" className="h-full w-full object-cover" /></span>
                <span className="block min-h-[32px] px-2 py-1"><span className="block text-xs font-medium leading-4">{preset.label}</span></span>
              </button>
            })}
          </div> : <div className="grid grid-cols-3 gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} aria-label="Basin shape">
          {visibleBasinPresets.map(preset => {
            const presetThumbnail = fullPedestal && 'pedestalDesign' in preset
              ? preset.pedestalDesign === 'classic' ? fullPedestalBasinThumbnail : preset.pedestalDesign === 'square' ? squareFullPedestalBasinThumbnail : taperedMonoblocBasinThumbnail
              : halfPedestal && 'shroudDesign' in preset
                ? preset.shroudDesign === 'curved' ? halfPedestalBasinThumbnail : preset.shroudDesign === 'square' ? squareHalfPedestalBasinThumbnail : integratedHalfPedestalBasinThumbnail
                : getBasinShapeThumbnail(currentBasinKind ?? COUNTERTOP_BASIN, preset.shape)
            return <button key={preset.shape} type="button" aria-pressed={placingBasin && basinShape === preset.shape && currentBasinKind === activeTool}
              aria-label={`Add ${preset.label} basin`} onClick={() => { setBasinPlacementShape(preset.shape); setTool(currentBasinKind) }}
              className={`overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring ${placingBasin && basinShape === preset.shape && currentBasinKind === activeTool ? 'border-primary bg-accent/30 ring-1 ring-primary/50' : 'border-border bg-secondary/40 hover:bg-accent/30'}`}>
              <span style={{ aspectRatio: '7 / 4' }} className="flex aspect-[7/4] items-center justify-center bg-background/40">{presetThumbnail ? <img src={presetThumbnail} alt="" loading="lazy" style={{ transform: 'scale(1.28)' }} className="h-full w-full object-contain" /> : <BasinPreview shape={preset.shape} pedestal={fullPedestal} halfPedestal={halfPedestal} semiRecessed={currentBasinKind === SEMI_RECESSED_BASIN} />}</span>
              <span style={{ minHeight: 32 }} className="block min-h-[32px] px-2 py-1.5 text-xs font-medium leading-4 text-foreground">{preset.label}</span>
            </button>
          })}
          </div>}
          {(wallHung ? visibleWallBasinPresets.length : visibleBasinPresets.length) === 0 && <CatalogEmptyState>No basin styles match "{query.trim()}".</CatalogEmptyState>}
        </>}
        </div>
        {placingBasin && <p role="status" className="text-xs text-muted-foreground">
          {halfPedestal || fullPedestal || wallHung ? 'Click a wall to place.' : inset ? 'Click a vanity countertop to place.' : 'Click a surface to place.'} Esc to cancel.
        </p>}
        </details>
      </section>}
      {activeCategory === 'Taps' && !basinCategoryOpen && <TapCatalog query={query} />}
      {search && activeCategory === 'Vanity' && visibleVanityCategories.length === 0 && <CatalogEmptyState>No vanity items match "{query.trim()}".</CatalogEmptyState>}
      {search && activeCategory === 'Basin' && visibleBasinCategories.length === 0 && <CatalogEmptyState>No basin items match "{query.trim()}".</CatalogEmptyState>}
      {activeCategory === 'Toilet' && <ToiletCatalog query={query} />}
      {activeCategory === 'Toilet' && <FloorToiletCatalog query={query} />}
      {activeCategory === 'Toilet' && <FlushPlateCatalog query={query} />}
      {activeCategory === 'Toilet' && <HolderCatalog query={query} />}
      {activeCategory === 'Shower' && <ShowerArmCatalog query={query} />}
      {activeCategory === 'Shower' && <ShowerHeadCatalog query={query} />}
      {activeCategory === 'Shower' && <ShowerMountCatalog query={query} />}
      {activeCategory === 'Shower' && <HandShowerCatalog query={query} />}
      {activeCategory === 'Shower' && <ShowerControlCatalog query={query} />}
      {activeCategory === 'Shower' && <WallSpoutCatalog query={query} />}
      {activeCategory === 'Shower' && <DividerCatalog query={query} />}
      {activeCategory === 'Shower' && <ShowerKitCatalog query={query} />}
      {activeCategory === 'Shower' && <ShowerAssemblyCatalog query={query} />}
      {activeCategory === 'Shower' && <BodyJetCatalog query={query} />}
      {activeCategory === 'Shower' && <ShowerHoseCatalog query={query} />}
      {activeCategory === 'Bath' && <BathCatalog query={query} />}
      </>}
    </div>
    </div>
  )
}
