'use client'

import { useScene } from '@pascal-app/core'
import { SliderControl, ToggleControl, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import type { ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { DEFAULT_POOL_SHAPE_DIMENSIONS, POOL_SHAPE_OPTIONS, type PoolShape } from '../design/shapes'
import { POOL_ENTRY_FEATURES } from '../design/entry-features'
import { POOL_FINISHES } from '../design/pool-finishes'
import { POOL_VISUAL_PRESETS } from '../design/visual-presets'
import { WATER_PRESETS } from '../shader/water-presets'
import type { PoolNode } from '../core/schema'
import { usePoolStore } from './store'
import { poolParametrics } from './parametrics'
import { POOL_SHAPE_THUMBNAILS } from './shell-thumbnails'
import { getSelectedPool } from './pool-selection'
import { editPoolOutline, poolOutlineAnchors } from '../design/outline-edit'

type Option = { label: string; value: string }

const WATER_QUALITY = ['low', 'medium', 'high', 'ultra'].map(option)
const BENCH_STYLES = [option('end'), option('perimeter')]
const BENCH_WALLS = [option('min-x'), option('max-x'), option('min-z'), option('max-z')]
const COPING_STYLES = [option('continuous'), option('natural-stone'), option('rock')]
const COPING_PROFILES = [option('square'), option('bullnose'), option('chamfered')]
const COPING_CORNERS = [option('miter'), option('rounded')]
const WATER_MODES = [option('base'), option('calm'), option('storm')]
const FLOOR_PROFILES = [option('flat'), option('shallow-to-deep')]
const ENTRY_FEATURES = POOL_ENTRY_FEATURES.map(option)
const POOL_FINISH_OPTIONS = POOL_FINISHES.map(option)
const VISUAL_PRESET_OPTIONS = POOL_VISUAL_PRESETS.map(option)
const WATER_PRESET_OPTIONS = WATER_PRESETS.map(option)

function option(value: string): Option {
  return {
    value,
    label: value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
  }
}

export function PoolShellSettings() {
  const selectedIds = useViewer((state) => state.selection.selectedIds)
  const selectedPool = useScene((state) => getSelectedPool(state.nodes, selectedIds))
  const draft = usePoolStore(useShallow((state) => ({
    shape: state.shape,
    length: state.length,
    width: state.width,
    visualPreset: state.visualPreset,
    floorProfile: state.floorProfile,
    depth: state.depth,
    shallowDepth: state.shallowDepth,
    deepDepth: state.deepDepth,
    slopeStart: state.slopeStart,
    slopeEnd: state.slopeEnd,
    coveRadius: state.coveRadius,
    entryFeature: state.entryFeature,
    entryLength: state.entryLength,
    entryWaterDepth: state.entryWaterDepth,
    stepCount: state.stepCount,
    benchEnabled: state.benchEnabled,
    benchStyle: state.benchStyle,
    benchWall: state.benchWall,
    benchBoundaryT: state.benchBoundaryT,
    benchLength: state.benchLength,
    benchWidth: state.benchWidth,
    benchWaterDepth: state.benchWaterDepth,
    copingWidth: state.copingWidth,
    copingThickness: state.copingThickness,
    copingStyle: state.copingStyle,
    copingStoneLength: state.copingStoneLength,
    copingJointWidth: state.copingJointWidth,
    copingIrregularity: state.copingIrregularity,
    copingSeed: state.copingSeed,
    copingColor: state.copingColor,
    copingProfile: state.copingProfile,
    copingCorner: state.copingCorner,
    shellThickness: state.shellThickness,
    floorThickness: state.floorThickness,
    openingClearance: state.openingClearance,
    finishedDeckElevation: state.finishedDeckElevation,
    designWaterElevation: state.designWaterElevation,
    shellColor: state.shellColor,
    interiorFinish: state.interiorFinish,
    waterPreset: state.waterPreset,
    waterQuality: state.waterQuality,
    shallowWaterColor: state.shallowWaterColor,
    deepWaterColor: state.deepWaterColor,
    surfaceDetail: state.surfaceDetail,
    viscosity: state.viscosity,
    rippleSize: state.rippleSize,
    clarity: state.clarity,
    rain: state.rain,
    breeze: state.breeze,
    sunElevation: state.sunElevation,
    sunAzimuth: state.sunAzimuth,
    normalScale: state.normalScale,
    normalStrength: state.normalStrength,
    normalSpeed: state.normalSpeed,
    reflectionStrength: state.reflectionStrength,
    reflectionFresnel: state.reflectionFresnel,
    reflectionDistortion: state.reflectionDistortion,
    refractionStrength: state.refractionStrength,
    causticsStrength: state.causticsStrength,
    causticsScale: state.causticsScale,
    causticsSpeed: state.causticsSpeed,
    intersectionStrength: state.intersectionStrength,
    intersectionColor: state.intersectionColor,
    intersectionWidth: state.intersectionWidth,
    shorelineStrength: state.shorelineStrength,
    shorelineWidth: state.shorelineWidth,
    shorelineSpeed: state.shorelineSpeed,
    specularStrength: state.specularStrength,
    specularSize: state.specularSize,
    specularHardness: state.specularHardness,
    waterColor: state.waterColor,
    waterMode: state.waterMode,
  })))
  const settings = selectedPool ?? draft

  function update(patch: Partial<PoolNode>) {
    if (patch.shallowDepth !== undefined && patch.deepDepth === undefined) {
      patch = { ...patch, deepDepth: Math.max(settings.deepDepth, patch.shallowDepth) }
    } else if (patch.deepDepth !== undefined && patch.shallowDepth === undefined) {
      patch = { ...patch, shallowDepth: Math.min(settings.shallowDepth, patch.deepDepth) }
    }
    if (patch.slopeStart !== undefined && patch.slopeEnd === undefined) {
      patch = { ...patch, slopeEnd: Math.max(settings.slopeEnd, patch.slopeStart) }
    } else if (patch.slopeEnd !== undefined && patch.slopeStart === undefined) {
      patch = { ...patch, slopeStart: Math.min(settings.slopeStart, patch.slopeEnd) }
    }
    const next = { ...settings, ...patch } as PoolNode
    const derived = poolParametrics.derive?.(next, patch) ?? {}
    usePoolStore.setState({ ...patch, ...derived } as never)
    if (selectedPool) {
      useScene.getState().updateNode(selectedPool.id as never, { ...patch, ...derived } as never)
    }
  }

  function chooseShape(shape: PoolShape) {
    const dimensions = DEFAULT_POOL_SHAPE_DIMENSIONS[shape]
    update({ shape, ...dimensions })
    if (!selectedPool) {
      useEditor.getState().setTool('pool:pool')
      useEditor.getState().setMode('build')
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <section className="flex flex-col gap-3 border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">Shape</h3>
          <span className="text-xs text-sidebar-foreground/55">{shapeLabel(settings.shape)} · {settings.length.toFixed(1)} m</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {POOL_SHAPE_OPTIONS.map(({ value, label }) => (
            <button
              aria-pressed={settings.shape === value}
              className={`group min-w-0 overflow-hidden rounded-lg border text-left transition-colors ${settings.shape === value ? 'border-sidebar-foreground ring-1 ring-sidebar-foreground/30' : 'border-sidebar-border hover:border-sidebar-foreground/60'}`}
              key={value}
              onClick={() => chooseShape(value)}
              type="button"
            >
              <img alt="" className="aspect-square w-full object-cover" src={POOL_SHAPE_THUMBNAILS[value]} />
              <span className="block truncate px-1.5 py-1.5 text-[11px]">{label}</span>
            </button>
          ))}
        </div>
        {selectedPool && (selectedPool.shape === 'custom' || selectedPool.shape === 'spline') &&
          <details className="rounded-lg border border-sidebar-border/70 px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium">Outline points · {poolOutlineAnchors(selectedPool).length}</summary>
            <p className="mt-2 text-[11px] text-sidebar-foreground/60">
              Drag orange points to reshape, green points to insert, and purple handles to bend a smooth pool in plan or 3D.
            </p>
            <div className="mt-2 max-h-44 overflow-y-auto">
              {poolOutlineAnchors(selectedPool).map((_, index) =>
                <div key={index} className="flex items-center justify-between border-t border-sidebar-border/60 py-1.5 text-xs">
                  <span>Point {index + 1}</span>
                  <button type="button" className="rounded px-2 py-1 text-sidebar-foreground/70 hover:bg-sidebar-accent disabled:opacity-40"
                    disabled={poolOutlineAnchors(selectedPool).length <= 3}
                    aria-label={`Remove pool outline point ${index + 1}`}
                    onClick={() => {
                      const patch = editPoolOutline(selectedPool, 'delete', index)
                      if (patch) useScene.getState().updateNode(selectedPool.id as never, patch as never)
                    }}>Remove</button>
                </div>)}
            </div>
          </details>}
        {!['spline', 'custom'].includes(settings.shape) && <div className="grid grid-cols-2 gap-2">
          <NumberSetting label={settings.shape === 'circle' ? 'Diameter' : 'Length'} min={0.5} max={100} step={0.1} unit="m" value={settings.length} onChange={(length) => update(settings.shape === 'circle' ? { length, width: length } : { length })} />
          {settings.shape !== 'circle' && <NumberSetting label="Width" min={0.5} max={100} step={0.1} unit="m" value={settings.width} onChange={(width) => update({ width })} />}
        </div>}
      </section>

      <SettingsSection open title="Depth profile" summary={depthSummary(settings)}>
        <SelectSetting label="Profile" options={FLOOR_PROFILES} value={settings.floorProfile} onChange={(value) => update({ floorProfile: value as PoolNode['floorProfile'] })} />
        {settings.floorProfile === 'flat' ? (
          <NumberSetting label="Depth" min={0.5} max={4} step={0.1} unit="m" value={settings.depth} onChange={(depth) => update({ depth })} />
        ) : <>
          <NumberSetting label="Shallow end" min={0.5} max={4} step={0.1} unit="m" value={settings.shallowDepth} onChange={(shallowDepth) => update({ shallowDepth })} />
          <NumberSetting label="Deep end" min={0.5} max={4} step={0.1} unit="m" value={settings.deepDepth} onChange={(deepDepth) => update({ deepDepth })} />
          <NumberSetting label="Slope starts at" min={0} max={100} step={1} unit="%" value={settings.slopeStart} onChange={(slopeStart) => update({ slopeStart })} />
          <NumberSetting label="Slope ends at" min={0} max={100} step={1} unit="%" value={settings.slopeEnd} onChange={(slopeEnd) => update({ slopeEnd })} />
        </>}
        <NumberSetting label="Floor cove radius" min={0} max={0.5} step={0.01} unit="m" value={settings.coveRadius} onChange={(coveRadius) => update({ coveRadius })} />
      </SettingsSection>

      <SettingsSection title="Entry feature" summary={option(settings.entryFeature).label}>
        <SelectSetting label="Type" options={ENTRY_FEATURES} value={settings.entryFeature} onChange={(value) => update({ entryFeature: value as PoolNode['entryFeature'] })} />
        {settings.entryFeature !== 'none' && <>
          <NumberSetting label="Entry length" min={0.5} max={8} step={0.1} unit="m" value={settings.entryLength} onChange={(entryLength) => update({ entryLength })} />
          {(settings.entryFeature === 'steps' || settings.entryFeature === 'tanning-shelf') && <NumberSetting label="Water depth" min={0.05} max={1} step={0.05} unit="m" value={settings.entryWaterDepth} onChange={(entryWaterDepth) => update({ entryWaterDepth })} />}
          {settings.entryFeature === 'steps' && <NumberSetting label="Number of steps" min={2} max={6} step={1} value={settings.stepCount} onChange={(stepCount) => update({ stepCount })} />}
        </>}
      </SettingsSection>

      <SettingsSection title="Bench" summary={settings.benchEnabled ? `${shapeLabel(settings.benchStyle)} bench` : 'Off'}>
        <BooleanSetting label="Add swim-out bench" checked={settings.benchEnabled} onChange={(benchEnabled) => update({ benchEnabled })} />
        {settings.benchEnabled && <>
          <SelectSetting label="Style" options={BENCH_STYLES} value={settings.benchStyle} onChange={(value) => update({ benchStyle: value as PoolNode['benchStyle'] })} />
          {settings.benchStyle === 'end' && <>
            <SelectSetting label="Pool wall" options={BENCH_WALLS} value={settings.benchWall} onChange={(value) => update({ benchWall: value as PoolNode['benchWall'] })} />
            <NumberSetting label="Position from shallow end" min={0} max={100} step={1} unit="%" value={settings.benchBoundaryT * 100} onChange={(value) => update({ benchBoundaryT: value / 100 })} />
            <NumberSetting label="Length" min={0.5} max={20} step={0.1} unit="m" value={settings.benchLength} onChange={(benchLength) => update({ benchLength })} />
          </>}
          <NumberSetting label="Width" min={0.2} max={1.5} step={0.05} unit="m" value={settings.benchWidth} onChange={(benchWidth) => update({ benchWidth })} />
          <NumberSetting label="Water depth" min={0.1} max={1.2} step={0.05} unit="m" value={settings.benchWaterDepth} onChange={(benchWaterDepth) => update({ benchWaterDepth })} />
        </>}
      </SettingsSection>

      <SettingsSection title="Structure & edge" summary={`${settings.copingStyle} · ${settings.shellThickness.toFixed(2)} m shell`}>
        <NumberSetting label="Shell thickness" min={0.05} max={2} step={0.01} unit="m" value={settings.shellThickness} onChange={(shellThickness) => update({ shellThickness })} />
        <NumberSetting label="Floor thickness" min={0.05} max={2} step={0.01} unit="m" value={settings.floorThickness} onChange={(floorThickness) => update({ floorThickness })} />
        <NumberSetting label="Opening clearance" min={0} max={0.2} step={0.005} unit="m" value={settings.openingClearance} onChange={(openingClearance) => update({ openingClearance })} />
        <NumberSetting label="Deck elevation" min={-100} max={100} step={0.01} unit="m" value={settings.finishedDeckElevation} onChange={(finishedDeckElevation) => update({ finishedDeckElevation })} />
        <NumberSetting label="Water elevation" min={-100} max={100} step={0.01} unit="m" value={settings.designWaterElevation} onChange={(designWaterElevation) => update({ designWaterElevation })} />
      </SettingsSection>

      <SettingsSection title="Coping & finish" summary={`${option(settings.interiorFinish).label} · ${settings.copingWidth.toFixed(2)} m coping`}>
        <SelectSetting label="Coping style" options={COPING_STYLES} value={settings.copingStyle} onChange={(value) => update({ copingStyle: value as PoolNode['copingStyle'] })} />
        <SelectSetting label="Coping profile" options={COPING_PROFILES} value={settings.copingProfile} onChange={(value) => update({ copingProfile: value as PoolNode['copingProfile'] })} />
        <SelectSetting label="Corner" options={COPING_CORNERS} value={settings.copingCorner} onChange={(value) => update({ copingCorner: value as PoolNode['copingCorner'] })} />
        <NumberSetting label="Coping width" min={0.1} max={1} step={0.05} unit="m" value={settings.copingWidth} onChange={(copingWidth) => update({ copingWidth })} />
        <NumberSetting label="Coping thickness" min={0.02} max={1} step={0.01} unit="m" value={settings.copingThickness} onChange={(copingThickness) => update({ copingThickness })} />
        {(settings.copingStyle === 'rock' || settings.copingStyle === 'natural-stone') && <>
          <NumberSetting label="Stone length" min={0.2} max={2} step={0.05} unit="m" value={settings.copingStoneLength} onChange={(copingStoneLength) => update({ copingStoneLength })} />
          <NumberSetting label="Stone variation" min={0} max={100} step={5} unit="%" value={settings.copingIrregularity * 100} onChange={(value) => update({ copingIrregularity: value / 100 })} />
          <NumberSetting label="Pattern seed" min={0} max={999999} step={1} value={settings.copingSeed} onChange={(copingSeed) => update({ copingSeed })} />
          <NumberSetting label="Joint width" min={0.005} max={0.1} step={0.005} unit="m" value={settings.copingJointWidth} onChange={(copingJointWidth) => update({ copingJointWidth })} />
        </>}
        <ColorSetting label="Coping color" value={settings.copingColor} onChange={(copingColor) => update({ copingColor })} />
        <ColorSetting label="Shell color" value={settings.shellColor} onChange={(shellColor) => update({ shellColor })} />
        <SelectSetting label="Interior finish" options={POOL_FINISH_OPTIONS} value={settings.interiorFinish} onChange={(value) => update({ interiorFinish: value as PoolNode['interiorFinish'] })} />
        <SelectSetting label="Visual style" options={VISUAL_PRESET_OPTIONS} value={settings.visualPreset} onChange={(value) => update({ visualPreset: value as PoolNode['visualPreset'] })} />
      </SettingsSection>

      <SettingsSection title="Water appearance" summary={option(settings.waterPreset).label}>
        <SelectSetting label="Water preset" options={WATER_PRESET_OPTIONS} value={settings.waterPreset} onChange={(value) => update({ waterPreset: value as PoolNode['waterPreset'] })} />
        <SelectSetting label="Quality" options={WATER_QUALITY} value={settings.waterQuality} onChange={(value) => update({ waterQuality: value as PoolNode['waterQuality'] })} />
        <SelectSetting label="Water mode" options={WATER_MODES} value={settings.waterMode} onChange={(value) => update({ waterMode: value as PoolNode['waterMode'] })} />
        <ColorSetting label="Shallow water" value={settings.shallowWaterColor} onChange={(shallowWaterColor) => update({ shallowWaterColor })} />
        <ColorSetting label="Deep water" value={settings.deepWaterColor} onChange={(deepWaterColor) => update({ deepWaterColor })} />
        <ColorSetting label="Water tint" value={settings.waterColor} onChange={(waterColor) => update({ waterColor })} />
        <NumberSetting label="Surface detail" min={0.4} max={3} step={0.05} value={settings.surfaceDetail} onChange={(surfaceDetail) => update({ surfaceDetail })} />
        <NumberSetting label="Viscosity" min={0} max={1} step={0.01} value={settings.viscosity} onChange={(viscosity) => update({ viscosity })} />
        <NumberSetting label="Ripple size" min={8} max={80} step={1} value={settings.rippleSize} onChange={(rippleSize) => update({ rippleSize })} />
        <NumberSetting label="Clarity" min={0.3} max={3} step={0.05} value={settings.clarity} onChange={(clarity) => update({ clarity })} />
        <NumberSetting label="Rain" min={0} max={1} step={0.01} value={settings.rain} onChange={(rain) => update({ rain })} />
        <NumberSetting label="Breeze" min={0} max={1} step={0.01} value={settings.breeze} onChange={(breeze) => update({ breeze })} />
        <NumberSetting label="Sun elevation" min={14} max={86} step={1} unit="°" value={settings.sunElevation} onChange={(sunElevation) => update({ sunElevation })} />
        <NumberSetting label="Sun azimuth" min={0} max={360} step={1} unit="°" value={settings.sunAzimuth} onChange={(sunAzimuth) => update({ sunAzimuth })} />
        <NumberSetting label="Normal scale" min={0.25} max={20} step={0.25} value={settings.normalScale} onChange={(normalScale) => update({ normalScale })} />
        <NumberSetting label="Normal strength" min={0} max={2} step={0.05} value={settings.normalStrength} onChange={(normalStrength) => update({ normalStrength })} />
        <NumberSetting label="Normal speed" min={-3} max={3} step={0.05} value={settings.normalSpeed} onChange={(normalSpeed) => update({ normalSpeed })} />
        <NumberSetting label="Reflection strength" min={0} max={2} step={0.05} value={settings.reflectionStrength} onChange={(reflectionStrength) => update({ reflectionStrength })} />
        <NumberSetting label="Reflection fresnel" min={1} max={12} step={0.1} value={settings.reflectionFresnel} onChange={(reflectionFresnel) => update({ reflectionFresnel })} />
        <NumberSetting label="Reflection distortion" min={0} max={4} step={0.05} value={settings.reflectionDistortion} onChange={(reflectionDistortion) => update({ reflectionDistortion })} />
        <NumberSetting label="Refraction strength" min={0} max={1} step={0.05} value={settings.refractionStrength} onChange={(refractionStrength) => update({ refractionStrength })} />
        <NumberSetting label="Caustics strength" min={0} max={4} step={0.05} value={settings.causticsStrength} onChange={(causticsStrength) => update({ causticsStrength })} />
        <NumberSetting label="Caustics scale" min={0.25} max={12} step={0.05} value={settings.causticsScale} onChange={(causticsScale) => update({ causticsScale })} />
        <NumberSetting label="Caustics speed" min={-4} max={4} step={0.05} value={settings.causticsSpeed} onChange={(causticsSpeed) => update({ causticsSpeed })} />
        <NumberSetting label="Shoreline strength" min={0} max={1} step={0.01} value={settings.shorelineStrength} onChange={(shorelineStrength) => update({ shorelineStrength })} />
        <NumberSetting label="Shoreline width" min={0.02} max={1} step={0.01} value={settings.shorelineWidth} onChange={(shorelineWidth) => update({ shorelineWidth })} />
        <NumberSetting label="Shoreline speed" min={-3} max={3} step={0.05} value={settings.shorelineSpeed} onChange={(shorelineSpeed) => update({ shorelineSpeed })} />
        <NumberSetting label="Intersection strength" min={0} max={1} step={0.01} value={settings.intersectionStrength} onChange={(intersectionStrength) => update({ intersectionStrength })} />
        <ColorSetting label="Intersection color" value={settings.intersectionColor} onChange={(intersectionColor) => update({ intersectionColor })} />
        <NumberSetting label="Intersection width" min={0.05} max={2} step={0.01} value={settings.intersectionWidth} onChange={(intersectionWidth) => update({ intersectionWidth })} />
        <NumberSetting label="Specular strength" min={0} max={4} step={0.05} value={settings.specularStrength} onChange={(specularStrength) => update({ specularStrength })} />
        <NumberSetting label="Specular size" min={0} max={1} step={0.01} value={settings.specularSize} onChange={(specularSize) => update({ specularSize })} />
        <NumberSetting label="Specular hardness" min={0} max={1} step={0.01} value={settings.specularHardness} onChange={(specularHardness) => update({ specularHardness })} />
      </SettingsSection>
    </div>
  )
}

function SettingsSection({ title, summary, open = false, children }: { title: string; summary: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="group border-b border-sidebar-border" open={open}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-sm">{title}</span>
        <span className="flex min-w-0 items-center gap-2 text-xs text-sidebar-foreground/55">
          <span className="truncate">{summary}</span>
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span>
        </span>
      </summary>
      <div className="flex flex-col gap-3 px-3 pb-4">{children}</div>
    </details>
  )
}

function NumberSetting({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (value: number) => void }) {
  const precision = step.toString().split('.')[1]?.length ?? 0
  return <SliderControl
    label={label}
    max={max}
    min={min}
    onChange={(next) => onChange(Math.max(min, Math.min(max, next)))}
    precision={precision}
    step={step}
    unit={unit}
    value={value}
  />
}

function SelectSetting({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  return <label className="flex min-h-9 items-center justify-between gap-3 text-xs text-sidebar-foreground/70">
    <span>{label}</span>
    <select aria-label={label} className="min-w-0 max-w-[60%] rounded-md border border-sidebar-border bg-sidebar-accent/50 px-2 py-1.5 text-right text-xs text-sidebar-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring" onChange={(event) => onChange(event.currentTarget.value)} value={value}>
      {options.map(({ label: optionLabel, value: optionValue }) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
    </select>
  </label>
}

function ColorSetting({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="flex min-h-9 items-center justify-between gap-3 text-xs text-sidebar-foreground/70">
    <span>{label}</span>
    <input aria-label={label} className="h-7 w-12 cursor-pointer rounded border border-sidebar-border bg-transparent p-0.5" onChange={(event) => onChange(event.currentTarget.value)} type="color" value={value} />
  </label>
}

function BooleanSetting({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <ToggleControl checked={checked} className="min-h-9 px-0 text-xs" label={label} onChange={onChange} />
}

function shapeLabel(shape: string) {
  return POOL_SHAPE_OPTIONS.find((option) => option.value === shape)?.label ?? shape
}

function depthSummary(pool: Pick<PoolNode, 'floorProfile' | 'depth' | 'shallowDepth' | 'deepDepth'>) {
  return pool.floorProfile === 'flat'
    ? `Flat · ${pool.depth.toFixed(2)} m`
    : `${pool.shallowDepth.toFixed(2)} → ${pool.deepDepth.toFixed(2)} m`
}
