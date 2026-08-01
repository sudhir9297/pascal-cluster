'use client'

import { useScene } from '@pascal-app/core'
import { SegmentedControl, SliderControl, ToggleControl, useEditor } from '@pascal-app/editor'
import { Fragment, useMemo } from 'react'
import {
  CATALOG_LAMP_THUMBNAIL,
  CATENARY_SUSPENDED_LIGHT_THUMBNAIL,
  COBRA_HEAD_LIGHT_THUMBNAIL,
  HERITAGE_CROOK_LIGHT_THUMBNAIL,
  MULTI_HEAD_AREA_LIGHT_THUMBNAIL,
  POST_TOP_LIGHT_THUMBNAIL,
  STREET_LIGHT_THUMBNAIL,
  WALL_ARM_LIGHT_THUMBNAIL,
  TRUSS_ROADWAY_LIGHT_THUMBNAIL,
  TUNNEL_LUMINAIRE_THUMBNAIL,
  TWIN_ARM_MEDIAN_LIGHT_THUMBNAIL,
  UTILITY_POLE_THUMBNAIL,
  ROAD_SIGN_THUMBNAILS,
  WALL_PACK_BULKHEAD_THUMBNAIL,
} from './art'
import {
  CATALOG_LAMP_VARIANTS,
  getCatalogLampConfig,
  getCatalogLampStyleOptions,
} from './catalog-lamp-config'
import { ROAD_SIGN_CATALOG, type RoadSignId } from './road-sign-config'
import { useEnvironmentStore } from './store'
import {
  STANDARD_LAMP_HEIGHT_MAX_M,
  STANDARD_LAMP_HEIGHT_MIN_M,
} from './lamp-constants'
import { STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M } from './utility-pole-geometry'
import { STANDARD_UTILITY_POLE_AUTO_CONNECT_DISTANCE_M } from './utility-wire-auto-connect'
import type { UtilityPoleAssembly } from './schema'

const STREET_LIGHT_KIND = 'environment:street-light'
const POST_TOP_LIGHT_KIND = 'environment:pedestrian-post-light'
const HERITAGE_CROOK_LIGHT_KIND = 'environment:heritage-crook-light'
const COBRA_HEAD_LIGHT_KIND = 'environment:cobra-head-light'
const TWIN_ARM_MEDIAN_LIGHT_KIND = 'environment:twin-arm-median-light'
const MULTI_HEAD_AREA_LIGHT_KIND = 'environment:multi-head-area-light'
const TRUSS_ROADWAY_LIGHT_KIND = 'environment:truss-roadway-light'
const UTILITY_POLE_KIND = 'environment:utility-pole'
const ROAD_SPLINE_KIND = 'environment:road-spline'
const ROAD_SIGN_KIND = 'environment:road-sign'

const activateCatalogLampTool = (kind: string) => {
  const setTool = useEditor.getState().setTool as (value: string) => void
  const config = getCatalogLampConfig(kind)
  useEnvironmentStore.getState().setCatalogLampVisualStyle(config?.projection ?? 'shoebox')
  setTool(kind)
  useEditor.getState().setMode('build')
}

const activateStreetLightTool = () => {
  const setTool = useEditor.getState().setTool as (value: string) => void
  setTool(STREET_LIGHT_KIND)
  useEditor.getState().setMode('build')
}

const activatePostTopLightTool = () => {
  const setTool = useEditor.getState().setTool as (value: string) => void
  setTool(POST_TOP_LIGHT_KIND)
  useEditor.getState().setMode('build')
}

const activateHeritageCrookLightTool = () => {
  const setTool = useEditor.getState().setTool as (value: string) => void
  setTool(HERITAGE_CROOK_LIGHT_KIND)
  useEditor.getState().setMode('build')
}

const activateCobraHeadLightTool = () => {
  const setTool = useEditor.getState().setTool as (value: string) => void
  setTool(COBRA_HEAD_LIGHT_KIND)
  useEditor.getState().setMode('build')
}

const activateTwinArmMedianLightTool = () => {
  const setTool = useEditor.getState().setTool as (value: string) => void
  setTool(TWIN_ARM_MEDIAN_LIGHT_KIND)
  useEditor.getState().setMode('build')
}

const activateMultiHeadAreaLightTool = () => {
  const setTool = useEditor.getState().setTool as (value: string) => void
  setTool(MULTI_HEAD_AREA_LIGHT_KIND)
  useEditor.getState().setMode('build')
}

const activateTrussRoadwayLightTool = () => {
  const setTool = useEditor.getState().setTool as (value: string) => void
  setTool(TRUSS_ROADWAY_LIGHT_KIND)
  useEditor.getState().setMode('build')
}

const activateUtilityPoleTool = () => {
  const setTool = useEditor.getState().setTool as (value: string) => void
  setTool(UTILITY_POLE_KIND)
  useEditor.getState().setMode('build')
}

const activateRoadSplineTool = () => {
  const setTool = useEditor.getState().setTool as (value: string) => void
  setTool(ROAD_SPLINE_KIND)
  useEditor.getState().setMode('build')
}

const activateRoadSignTool = (signId: RoadSignId) => {
  const setTool = useEditor.getState().setTool as (value: string) => void
  useEnvironmentStore.getState().setRoadSignId(signId)
  setTool(ROAD_SIGN_KIND)
  useEditor.getState().setMode('build')
}

function StreetLightArtwork() {
  return (
    <img
      alt="Street light"
      className="aspect-square w-full rounded-lg object-cover ring-1 ring-black/10"
      draggable={false}
      src={STREET_LIGHT_THUMBNAIL}
    />
  )
}

function PostTopLightArtwork() {
  return (
    <img
      alt="Pedestrian post-top light"
      className="aspect-square w-full rounded-lg object-cover ring-1 ring-black/10"
      draggable={false}
      src={POST_TOP_LIGHT_THUMBNAIL}
    />
  )
}

function HeritageCrookLightArtwork() {
  return (
    <img
      alt="Heritage Bishop's Crook light"
      className="aspect-square w-full rounded-lg object-cover ring-1 ring-black/10"
      draggable={false}
      src={HERITAGE_CROOK_LIGHT_THUMBNAIL}
    />
  )
}

function CobraHeadLightArtwork() {
  return (
    <img
      alt="Cobra-head roadway light"
      className="aspect-square w-full rounded-lg object-cover ring-1 ring-black/10"
      draggable={false}
      src={COBRA_HEAD_LIGHT_THUMBNAIL}
    />
  )
}

function TwinArmMedianLightArtwork() {
  return (
    <img
      alt="Twin-arm median roadway light"
      className="aspect-square w-full rounded-lg object-cover ring-1 ring-black/10"
      draggable={false}
      src={TWIN_ARM_MEDIAN_LIGHT_THUMBNAIL}
    />
  )
}

function MultiHeadAreaLightArtwork() {
  return (
    <img
      alt="Triple or four-way area pole"
      className="aspect-square w-full rounded-lg object-cover ring-1 ring-black/10"
      draggable={false}
      src={MULTI_HEAD_AREA_LIGHT_THUMBNAIL}
    />
  )
}

function TrussRoadwayLightArtwork() {
  return (
    <img
      alt="Truss roadway light"
      className="aspect-square w-full rounded-lg object-cover ring-1 ring-black/10"
      draggable={false}
      src={TRUSS_ROADWAY_LIGHT_THUMBNAIL}
    />
  )
}

function CatalogLampArtwork({ label, thumbnail = CATALOG_LAMP_THUMBNAIL }: { label: string; thumbnail?: string }) {
  return (
    <img
      alt={label}
      className="aspect-square w-full rounded-lg object-cover ring-1 ring-black/10"
      draggable={false}
      src={thumbnail}
    />
  )
}

function UtilityPoleArtwork() {
  return (
    <img
      alt="Utility pole"
      className="aspect-square w-full rounded-lg object-cover ring-1 ring-black/10"
      draggable={false}
      src={UTILITY_POLE_THUMBNAIL}
    />
  )
}

function RoadSplineArtwork() {
  return (
    <svg
      aria-label="Road spline"
      className="aspect-square w-full rounded-lg bg-[#d9d5ca] ring-1 ring-black/10"
      role="img"
      viewBox="0 0 160 160"
    >
      <path d="M-10 121 C 33 111, 47 48, 85 45 S 135 74, 170 32" fill="none" stroke="#9d9a91" strokeLinecap="round" strokeWidth="51" />
      <path d="M-10 121 C 33 111, 47 48, 85 45 S 135 74, 170 32" fill="none" stroke="#35383d" strokeLinecap="round" strokeWidth="43" />
      <path d="M-10 121 C 33 111, 47 48, 85 45 S 135 74, 170 32" fill="none" stroke="#d9c98c" strokeDasharray="8 8" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function RoadSignArtwork({ signId }: { signId: RoadSignId }) {
  return (
    <img
      alt={`${signId} road sign`}
      className="aspect-square w-full rounded-lg object-cover ring-1 ring-black/10"
      draggable={false}
      src={ROAD_SIGN_THUMBNAILS[signId]}
    />
  )
}

/** Environment asset cards and their placement brush settings. */
export default function EnvironmentPanel() {
  const panelCategory = useEnvironmentStore((s) => s.panelCategory)
  const setPanelCategory = useEnvironmentStore((s) => s.setPanelCategory)
  const height = useEnvironmentStore((s) => s.streetLightHeight)
  const placementMode = useEnvironmentStore((s) => s.placementMode)
  const armLength = useEnvironmentStore((s) => s.streetLightArmLength)
  const lightOn = useEnvironmentStore((s) => s.streetLightOn)
  const postTopLightHeight = useEnvironmentStore((s) => s.postTopLightHeight)
  const postTopLightOn = useEnvironmentStore((s) => s.postTopLightOn)
  const heritageCrookHeight = useEnvironmentStore((s) => s.heritageCrookHeight)
  const heritageCrookArmReach = useEnvironmentStore((s) => s.heritageCrookArmReach)
  const heritageCrookLightOn = useEnvironmentStore((s) => s.heritageCrookLightOn)
  const cobraHeadHeight = useEnvironmentStore((s) => s.cobraHeadHeight)
  const cobraHeadArmLength = useEnvironmentStore((s) => s.cobraHeadArmLength)
  const cobraHeadLightOn = useEnvironmentStore((s) => s.cobraHeadLightOn)
  const twinArmMedianHeight = useEnvironmentStore((s) => s.twinArmMedianHeight)
  const twinArmMedianArmLength = useEnvironmentStore((s) => s.twinArmMedianArmLength)
  const twinArmMedianLightOn = useEnvironmentStore((s) => s.twinArmMedianLightOn)
  const multiHeadAreaHeight = useEnvironmentStore((s) => s.multiHeadAreaHeight)
  const multiHeadAreaArmLength = useEnvironmentStore((s) => s.multiHeadAreaArmLength)
  const multiHeadAreaHeadCount = useEnvironmentStore((s) => s.multiHeadAreaHeadCount)
  const multiHeadAreaLightOn = useEnvironmentStore((s) => s.multiHeadAreaLightOn)
  const trussRoadwayHeight = useEnvironmentStore((s) => s.trussRoadwayHeight)
  const trussRoadwayArmLength = useEnvironmentStore((s) => s.trussRoadwayArmLength)
  const trussRoadwayBraceDepth = useEnvironmentStore((s) => s.trussRoadwayBraceDepth)
  const trussRoadwayLightOn = useEnvironmentStore((s) => s.trussRoadwayLightOn)
  const catalogLampHeight = useEnvironmentStore((s) => s.catalogLampHeight)
  const catalogLampArmLength = useEnvironmentStore((s) => s.catalogLampArmLength)
  const catalogLampVisualStyle = useEnvironmentStore((s) => s.catalogLampVisualStyle)
  const catalogLampLightOn = useEnvironmentStore((s) => s.catalogLampLightOn)
  const utilityPoleHeight = useEnvironmentStore((s) => s.utilityPoleHeight)
  const utilityPoleCrossarmLength = useEnvironmentStore((s) => s.utilityPoleCrossarmLength)
  const utilityPoleTransformerMounted = useEnvironmentStore((s) => s.utilityPoleTransformerMounted)
  const utilityPoleAssembly = useEnvironmentStore((s) => s.utilityPoleAssembly)
  const roadWidth = useEnvironmentStore((s) => s.roadWidth)
  const roadPathMode = useEnvironmentStore((s) => s.roadPathMode)
  const roadLaneCount = useEnvironmentStore((s) => s.roadLaneCount)
  const roadCenterLineStyle = useEnvironmentStore((s) => s.roadCenterLineStyle)
  const roadEdgeLines = useEnvironmentStore((s) => s.roadEdgeLines)
  const roadSignPostHeight = useEnvironmentStore((s) => s.roadSignPostHeight)
  const roadSignScale = useEnvironmentStore((s) => s.roadSignScale)
  const roadSignMounting = useEnvironmentStore((s) => s.roadSignMounting)
  const roadSignId = useEnvironmentStore((s) => s.roadSignId)
  const activeTool = useEditor((s) => s.tool)
  const streetLightCount = useScene(
    (s) => Object.values(s.nodes).filter((n) => (n.type as string) === STREET_LIGHT_KIND).length,
  )
  const postTopLightCount = useScene(
    (s) => Object.values(s.nodes).filter((n) => (n.type as string) === POST_TOP_LIGHT_KIND).length,
  )
  const heritageCrookLightCount = useScene(
    (s) =>
      Object.values(s.nodes).filter((n) => (n.type as string) === HERITAGE_CROOK_LIGHT_KIND).length,
  )
  const cobraHeadLightCount = useScene(
    (s) =>
      Object.values(s.nodes).filter((n) => (n.type as string) === COBRA_HEAD_LIGHT_KIND).length,
  )
  const twinArmMedianLightCount = useScene(
    (s) =>
      Object.values(s.nodes).filter((n) => (n.type as string) === TWIN_ARM_MEDIAN_LIGHT_KIND)
        .length,
  )
  const multiHeadAreaLightCount = useScene(
    (s) =>
      Object.values(s.nodes).filter((n) => (n.type as string) === MULTI_HEAD_AREA_LIGHT_KIND)
        .length,
  )
  const trussRoadwayLightCount = useScene(
    (s) =>
      Object.values(s.nodes).filter((n) => (n.type as string) === TRUSS_ROADWAY_LIGHT_KIND).length,
  )
  const sceneNodes = useScene((s) => s.nodes)
  const catalogLampCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const node of Object.values(sceneNodes)) {
      const kind = node.type as string
      if (CATALOG_LAMP_VARIANTS.some((variant) => variant.kind === kind)) {
        counts[kind] = (counts[kind] ?? 0) + 1
      }
    }
    return counts
  }, [sceneNodes])
  const roadSignCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const node of Object.values(sceneNodes)) {
      if ((node.type as string) !== ROAD_SIGN_KIND) continue
      const signId = (node as { signId?: string }).signId ?? 'stop'
      counts[signId] = (counts[signId] ?? 0) + 1
    }
    return counts
  }, [sceneNodes])
  const utilityPoleCount = useScene(
    (s) => Object.values(s.nodes).filter((n) => (n.type as string) === UTILITY_POLE_KIND).length,
  )
  const roadSplineCount = useScene(
    (s) => Object.values(s.nodes).filter((n) => (n.type as string) === ROAD_SPLINE_KIND).length,
  )
  const roadSignCount = useScene(
    (s) => Object.values(s.nodes).filter((n) => (n.type as string) === ROAD_SIGN_KIND).length,
  )
  const streetLightArmed = (activeTool as string | null) === STREET_LIGHT_KIND
  const postTopLightArmed = (activeTool as string | null) === POST_TOP_LIGHT_KIND
  const heritageCrookLightArmed = (activeTool as string | null) === HERITAGE_CROOK_LIGHT_KIND
  const cobraHeadLightArmed = (activeTool as string | null) === COBRA_HEAD_LIGHT_KIND
  const twinArmMedianLightArmed = (activeTool as string | null) === TWIN_ARM_MEDIAN_LIGHT_KIND
  const multiHeadAreaLightArmed = (activeTool as string | null) === MULTI_HEAD_AREA_LIGHT_KIND
  const trussRoadwayLightArmed = (activeTool as string | null) === TRUSS_ROADWAY_LIGHT_KIND
  const catalogLampArmed = CATALOG_LAMP_VARIANTS.some(
    (variant) => (activeTool as string | null) === variant.kind,
  )
  const activeCatalogVariant = CATALOG_LAMP_VARIANTS.find(
    (variant) => (activeTool as string | null) === variant.kind,
  )
  const catalogLampStyleOptions = activeCatalogVariant
    ? getCatalogLampStyleOptions(activeCatalogVariant.kind)
    : []
  const utilityPoleArmed = (activeTool as string | null) === UTILITY_POLE_KIND
  const roadSplineArmed = (activeTool as string | null) === ROAD_SPLINE_KIND
  const roadSignArmed = (activeTool as string | null) === ROAD_SIGN_KIND
  const armed =
    panelCategory === 'lighting'
      ? streetLightArmed ||
        postTopLightArmed ||
        heritageCrookLightArmed ||
        cobraHeadLightArmed ||
        twinArmMedianLightArmed ||
        multiHeadAreaLightArmed ||
        trussRoadwayLightArmed ||
        catalogLampArmed
      : panelCategory === 'utilities'
        ? utilityPoleArmed
        : roadSplineArmed || roadSignArmed
  const count =
    panelCategory === 'lighting'
      ? streetLightCount +
        postTopLightCount +
        heritageCrookLightCount +
        cobraHeadLightCount +
        twinArmMedianLightCount +
        multiHeadAreaLightCount +
        trussRoadwayLightCount +
        Object.values(catalogLampCounts).reduce((total, value) => total + value, 0)
      : panelCategory === 'utilities'
        ? utilityPoleCount
        : roadSplineCount + roadSignCount

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4 text-sidebar-foreground">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Environment</h2>
          <span className="rounded-full bg-sidebar-accent px-2 py-0.5 text-sidebar-foreground/70 text-xs">
            {count} placed
          </span>
        </div>
        <SegmentedControl
          onChange={setPanelCategory}
          options={[
            { label: 'Lighting', value: 'lighting' },
            { label: 'Roads', value: 'roads' },
            { label: 'Utilities', value: 'utilities' },
          ]}
          value={panelCategory}
        />
        <p className="text-sidebar-foreground/50 text-xs">
          {panelCategory === 'roads' && roadSplineArmed
            ? 'Choose a road mode, click points or endpoints, then press Enter to finish.'
            : panelCategory === 'roads' && roadSignArmed
              ? 'Choose a sign, then click the ground to place it.'
              : armed && placementMode === 'continuous'
                ? 'Continuous: click repeatedly to place. Press Esc to stop.'
                : armed
                  ? 'Single: place once, then return to selection.'
                  : panelCategory === 'lighting'
                    ? 'Choose a lamp, then click the ground to place it.'
                    : panelCategory === 'roads'
                      ? 'Choose Road to draw a new road.'
                      : 'Choose a utility asset, then click the ground to place it.'}
        </p>
      </header>

      {panelCategory !== 'roads' && <div className="flex flex-col gap-1.5">
        <span className="font-medium text-sidebar-foreground/65 text-xs">Placement</span>
        <div className="grid grid-cols-2 rounded-lg bg-sidebar-accent/55 p-1 ring-1 ring-sidebar-border">
          {(['single', 'continuous'] as const).map((mode) => {
            const selected = placementMode === mode
            return (
              <button
                aria-pressed={selected}
                className={`rounded-md px-2 py-1.5 font-medium text-xs transition-colors ${
                  selected
                    ? 'bg-sidebar text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border'
                    : 'text-sidebar-foreground/55 hover:text-sidebar-foreground'
                }`}
                key={mode}
                onClick={() => useEnvironmentStore.getState().setPlacementMode(mode)}
                type="button"
              >
                {mode === 'single' ? 'Single' : 'Continuous'}
              </button>
            )
          })}
        </div>
      </div>}

      {panelCategory === 'lighting' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 pt-1 font-medium text-sidebar-foreground/55 text-xs uppercase tracking-wide">
            Roadway and area heads
          </div>
          <button
            className={`group relative flex flex-col gap-2 rounded-xl border p-2 transition-all ${
              streetLightArmed
                ? 'border-sidebar-ring bg-sidebar-accent shadow-sm'
                : 'border-sidebar-border hover:border-sidebar-ring/50 hover:bg-sidebar-accent/40'
            }`}
            onClick={activateStreetLightTool}
            type="button"
          >
            <div className="transition-transform group-hover:scale-[1.02]">
              <StreetLightArtwork />
            </div>
            <span className="flex items-center justify-between gap-1 pl-0.5 font-medium text-xs">
              Street light{' '}
              <span className="font-normal text-sidebar-foreground/45">{streetLightCount}</span>
            </span>
            {streetLightArmed && (
              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-sidebar-ring ring-2 ring-sidebar-accent" />
            )}
          </button>
          <button
            className={`group relative flex flex-col gap-2 rounded-xl border p-2 transition-all ${
              postTopLightArmed
                ? 'border-sidebar-ring bg-sidebar-accent shadow-sm'
                : 'border-sidebar-border hover:border-sidebar-ring/50 hover:bg-sidebar-accent/40'
            }`}
            onClick={activatePostTopLightTool}
            type="button"
          >
            <div className="transition-transform group-hover:scale-[1.02]">
              <PostTopLightArtwork />
            </div>
            <span className="flex items-center justify-between gap-1 pl-0.5 font-medium text-xs">
              Post-top{' '}
              <span className="font-normal text-sidebar-foreground/45">{postTopLightCount}</span>
            </span>
            {postTopLightArmed && (
              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-sidebar-ring ring-2 ring-sidebar-accent" />
            )}
          </button>
          <button
            className={`group relative flex flex-col gap-2 rounded-xl border p-2 transition-all ${
              heritageCrookLightArmed
                ? 'border-sidebar-ring bg-sidebar-accent shadow-sm'
                : 'border-sidebar-border hover:border-sidebar-ring/50 hover:bg-sidebar-accent/40'
            }`}
            onClick={activateHeritageCrookLightTool}
            type="button"
          >
            <div className="transition-transform group-hover:scale-[1.02]">
              <HeritageCrookLightArtwork />
            </div>
            <span className="flex items-center justify-between gap-1 pl-0.5 font-medium text-xs">
              Bishop's Crook{' '}
              <span className="font-normal text-sidebar-foreground/45">
                {heritageCrookLightCount}
              </span>
            </span>
            {heritageCrookLightArmed && (
              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-sidebar-ring ring-2 ring-sidebar-accent" />
            )}
          </button>
          <button
            className={`group relative flex flex-col gap-2 rounded-xl border p-2 transition-all ${
              cobraHeadLightArmed
                ? 'border-sidebar-ring bg-sidebar-accent shadow-sm'
                : 'border-sidebar-border hover:border-sidebar-ring/50 hover:bg-sidebar-accent/40'
            }`}
            onClick={activateCobraHeadLightTool}
            type="button"
          >
            <div className="transition-transform group-hover:scale-[1.02]">
              <CobraHeadLightArtwork />
            </div>
            <span className="flex items-center justify-between gap-1 pl-0.5 font-medium text-xs">
              Cobra-head{' '}
              <span className="font-normal text-sidebar-foreground/45">{cobraHeadLightCount}</span>
            </span>
            {cobraHeadLightArmed && (
              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-sidebar-ring ring-2 ring-sidebar-accent" />
            )}
          </button>
          <button
            className={`group relative flex flex-col gap-2 rounded-xl border p-2 transition-all ${
              twinArmMedianLightArmed
                ? 'border-sidebar-ring bg-sidebar-accent shadow-sm'
                : 'border-sidebar-border hover:border-sidebar-ring/50 hover:bg-sidebar-accent/40'
            }`}
            onClick={activateTwinArmMedianLightTool}
            type="button"
          >
            <div className="transition-transform group-hover:scale-[1.02]">
              <TwinArmMedianLightArtwork />
            </div>
            <span className="flex items-center justify-between gap-1 pl-0.5 font-medium text-xs">
              Twin-arm median{' '}
              <span className="font-normal text-sidebar-foreground/45">
                {twinArmMedianLightCount}
              </span>
            </span>
            {twinArmMedianLightArmed && (
              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-sidebar-ring ring-2 ring-sidebar-accent" />
            )}
          </button>
          <button
            className={`group relative flex flex-col gap-2 rounded-xl border p-2 transition-all ${
              multiHeadAreaLightArmed
                ? 'border-sidebar-ring bg-sidebar-accent shadow-sm'
                : 'border-sidebar-border hover:border-sidebar-ring/50 hover:bg-sidebar-accent/40'
            }`}
            onClick={activateMultiHeadAreaLightTool}
            type="button"
          >
            <div className="transition-transform group-hover:scale-[1.02]">
              <MultiHeadAreaLightArtwork />
            </div>
            <span className="flex items-center justify-between gap-1 pl-0.5 font-medium text-xs">
              Area pole{' '}
              <span className="font-normal text-sidebar-foreground/45">
                {multiHeadAreaLightCount}
              </span>
            </span>
            {multiHeadAreaLightArmed && (
              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-sidebar-ring ring-2 ring-sidebar-accent" />
            )}
          </button>
          <button
            className={`group relative flex flex-col gap-2 rounded-xl border p-2 transition-all ${
              trussRoadwayLightArmed
                ? 'border-sidebar-ring bg-sidebar-accent shadow-sm'
                : 'border-sidebar-border hover:border-sidebar-ring/50 hover:bg-sidebar-accent/40'
            }`}
            onClick={activateTrussRoadwayLightTool}
            type="button"
          >
            <div className="transition-transform group-hover:scale-[1.02]">
              <TrussRoadwayLightArtwork />
            </div>
            <span className="flex items-center justify-between gap-1 pl-0.5 font-medium text-xs">
              Truss roadway{' '}
              <span className="font-normal text-sidebar-foreground/45">
                {trussRoadwayLightCount}
              </span>
            </span>
            {trussRoadwayLightArmed && (
              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-sidebar-ring ring-2 ring-sidebar-accent" />
            )}
          </button>
          {CATALOG_LAMP_VARIANTS.map((variant, index) => {
            const variantArmed = (activeTool as string | null) === variant.kind
            const previousVariant = CATALOG_LAMP_VARIANTS[index - 1]
            const showFamilyHeading = !previousVariant || previousVariant.family !== variant.family
            const thumbnail = variant.projection === 'catenary'
              ? CATENARY_SUSPENDED_LIGHT_THUMBNAIL
              : variant.projection === 'wall-arm'
                ? WALL_ARM_LIGHT_THUMBNAIL
                : variant.projection === 'wall-pack'
                  ? WALL_PACK_BULKHEAD_THUMBNAIL
                  : variant.projection === 'tunnel'
                    ? TUNNEL_LUMINAIRE_THUMBNAIL
                    : CATALOG_LAMP_THUMBNAIL
            return (
              <Fragment key={variant.kind}>
                {showFamilyHeading && (
                  <div className="col-span-2 pt-2 font-medium text-sidebar-foreground/55 text-xs uppercase tracking-wide">
                    {variant.family} styles
                  </div>
                )}
                <button
                  className={`group relative flex flex-col gap-2 rounded-xl border p-2 transition-all ${
                    variantArmed
                      ? 'border-sidebar-ring bg-sidebar-accent shadow-sm'
                      : 'border-sidebar-border hover:border-sidebar-ring/50 hover:bg-sidebar-accent/40'
                  }`}
                  onClick={() => activateCatalogLampTool(variant.kind)}
                  type="button"
                >
                  <div className="transition-transform group-hover:scale-[1.02]">
                    <CatalogLampArtwork label={variant.label} thumbnail={thumbnail} />
                  </div>
                  <span className="flex items-center justify-between gap-1 pl-0.5 font-medium text-xs">
                    {variant.label}{' '}
                    <span className="font-normal text-sidebar-foreground/45">
                      {catalogLampCounts[variant.kind] ?? 0}
                    </span>
                  </span>
                  {variantArmed && (
                    <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-sidebar-ring ring-2 ring-sidebar-accent" />
                  )}
                </button>
              </Fragment>
            )
          })}
        </div>
      )}

      {panelCategory === 'utilities' && (
        <button
          className={`group relative flex flex-col gap-2 rounded-xl border p-2 transition-all ${
            utilityPoleArmed
              ? 'border-sidebar-ring bg-sidebar-accent shadow-sm'
              : 'border-sidebar-border hover:border-sidebar-ring/50 hover:bg-sidebar-accent/40'
          }`}
          onClick={activateUtilityPoleTool}
          type="button"
        >
          <div className="transition-transform group-hover:scale-[1.02]">
            <UtilityPoleArtwork />
          </div>
          <span className="flex items-center justify-between gap-1 pl-0.5 font-medium text-xs">
            Utility pole{' '}
            <span className="font-normal text-sidebar-foreground/45">{utilityPoleCount}</span>
          </span>
          {utilityPoleArmed && (
            <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-sidebar-ring ring-2 ring-sidebar-accent" />
          )}
        </button>
      )}

      {panelCategory === 'roads' && (
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`group relative flex flex-col gap-2 rounded-xl border p-2 transition-all ${
              roadSplineArmed
                ? 'border-sidebar-ring bg-sidebar-accent shadow-sm'
                : 'border-sidebar-border hover:border-sidebar-ring/50 hover:bg-sidebar-accent/40'
            }`}
            onClick={activateRoadSplineTool}
            type="button"
          >
            <div className="transition-transform group-hover:scale-[1.02]">
              <RoadSplineArtwork />
            </div>
            <span className="flex items-center justify-between gap-1 pl-0.5 font-medium text-xs">
              Road{' '}
              <span className="font-normal text-sidebar-foreground/45">{roadSplineCount}</span>
            </span>
            {roadSplineArmed && (
              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-sidebar-ring ring-2 ring-sidebar-accent" />
            )}
          </button>
          <div className="col-span-2 pt-2 font-medium text-sidebar-foreground/55 text-xs uppercase tracking-wide">
            Common signs
          </div>
          {ROAD_SIGN_CATALOG.map((sign) => {
            const signArmed = roadSignArmed && roadSignId === sign.id
            return (
              <button
                className={`group relative flex flex-col gap-2 rounded-xl border p-2 text-left transition-all ${
                  signArmed
                    ? 'border-sidebar-ring bg-sidebar-accent shadow-sm'
                    : 'border-sidebar-border hover:border-sidebar-ring/50 hover:bg-sidebar-accent/40'
                }`}
                key={sign.id}
                onClick={() => activateRoadSignTool(sign.id)}
                title={sign.description}
                type="button"
              >
                <div className="transition-transform group-hover:scale-[1.02]">
                  <RoadSignArtwork signId={sign.id} />
                </div>
                <span className="flex items-center justify-between gap-1 pl-0.5 font-medium text-xs">
                  {sign.label}{' '}
                  <span className="font-normal text-sidebar-foreground/45">{roadSignCounts[sign.id] ?? 0}</span>
                </span>
                {signArmed && (
                  <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-sidebar-ring ring-2 ring-sidebar-accent" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {panelCategory === 'lighting' && streetLightArmed && (
        <div className="flex flex-col gap-0.5">
          <SliderControl
            label="Height"
            max={STANDARD_LAMP_HEIGHT_MAX_M}
            min={STANDARD_LAMP_HEIGHT_MIN_M}
            onChange={useEnvironmentStore.getState().setStreetLightHeight}
            precision={2}
            restoreOnCommit={false}
            step={0.25}
            unit="m"
            value={height}
          />
          <SliderControl
            label="Arm"
            max={3}
            min={0.3}
            onChange={useEnvironmentStore.getState().setStreetLightArmLength}
            precision={1}
            restoreOnCommit={false}
            step={0.1}
            unit="m"
            value={armLength}
          />
          <ToggleControl
            checked={lightOn}
            label="Lamp on"
            onChange={useEnvironmentStore.getState().setStreetLightOn}
          />
        </div>
      )}
      {panelCategory === 'lighting' && postTopLightArmed && (
        <div className="flex flex-col gap-0.5">
          <SliderControl
            label="Height"
            max={STANDARD_LAMP_HEIGHT_MAX_M}
            min={STANDARD_LAMP_HEIGHT_MIN_M}
            onChange={useEnvironmentStore.getState().setPostTopLightHeight}
            precision={2}
            restoreOnCommit={false}
            step={0.1}
            unit="m"
            value={postTopLightHeight}
          />
          <ToggleControl
            checked={postTopLightOn}
            label="Lamp on"
            onChange={useEnvironmentStore.getState().setPostTopLightOn}
          />
        </div>
      )}
      {panelCategory === 'lighting' && heritageCrookLightArmed && (
        <div className="flex flex-col gap-0.5">
          <SliderControl
            label="Height"
            max={STANDARD_LAMP_HEIGHT_MAX_M}
            min={STANDARD_LAMP_HEIGHT_MIN_M}
            onChange={useEnvironmentStore.getState().setHeritageCrookHeight}
            precision={2}
            restoreOnCommit={false}
            step={0.1}
            unit="m"
            value={heritageCrookHeight}
          />
          <SliderControl
            label="Arm reach"
            max={1.5}
            min={0.5}
            onChange={useEnvironmentStore.getState().setHeritageCrookArmReach}
            precision={2}
            restoreOnCommit={false}
            step={0.05}
            unit="m"
            value={heritageCrookArmReach}
          />
          <ToggleControl
            checked={heritageCrookLightOn}
            label="Lamp on"
            onChange={useEnvironmentStore.getState().setHeritageCrookLightOn}
          />
        </div>
      )}
      {panelCategory === 'lighting' && cobraHeadLightArmed && (
        <div className="flex flex-col gap-0.5">
          <SliderControl
            label="Height"
            max={STANDARD_LAMP_HEIGHT_MAX_M}
            min={STANDARD_LAMP_HEIGHT_MIN_M}
            onChange={useEnvironmentStore.getState().setCobraHeadHeight}
            precision={2}
            restoreOnCommit={false}
            step={0.1}
            unit="m"
            value={cobraHeadHeight}
          />
          <SliderControl
            label="Arm"
            max={3}
            min={0.5}
            onChange={useEnvironmentStore.getState().setCobraHeadArmLength}
            precision={2}
            restoreOnCommit={false}
            step={0.1}
            unit="m"
            value={cobraHeadArmLength}
          />
          <ToggleControl
            checked={cobraHeadLightOn}
            label="Lamp on"
            onChange={useEnvironmentStore.getState().setCobraHeadLightOn}
          />
        </div>
      )}
      {panelCategory === 'lighting' && twinArmMedianLightArmed && (
        <div className="flex flex-col gap-0.5">
          <SliderControl
            label="Height"
            max={STANDARD_LAMP_HEIGHT_MAX_M}
            min={STANDARD_LAMP_HEIGHT_MIN_M}
            onChange={useEnvironmentStore.getState().setTwinArmMedianHeight}
            precision={2}
            restoreOnCommit={false}
            step={0.1}
            unit="m"
            value={twinArmMedianHeight}
          />
          <SliderControl
            label="Arm"
            max={3}
            min={0.5}
            onChange={useEnvironmentStore.getState().setTwinArmMedianArmLength}
            precision={2}
            restoreOnCommit={false}
            step={0.1}
            unit="m"
            value={twinArmMedianArmLength}
          />
          <ToggleControl
            checked={twinArmMedianLightOn}
            label="Lamps on"
            onChange={useEnvironmentStore.getState().setTwinArmMedianLightOn}
          />
        </div>
      )}
      {panelCategory === 'lighting' && multiHeadAreaLightArmed && (
        <div className="flex flex-col gap-0.5">
          <SliderControl
            label="Height"
            max={STANDARD_LAMP_HEIGHT_MAX_M}
            min={STANDARD_LAMP_HEIGHT_MIN_M}
            onChange={useEnvironmentStore.getState().setMultiHeadAreaHeight}
            precision={2}
            restoreOnCommit={false}
            step={0.1}
            unit="m"
            value={multiHeadAreaHeight}
          />
          <SliderControl
            label="Arm"
            max={3}
            min={0.5}
            onChange={useEnvironmentStore.getState().setMultiHeadAreaArmLength}
            precision={2}
            restoreOnCommit={false}
            step={0.1}
            unit="m"
            value={multiHeadAreaArmLength}
          />
          <SegmentedControl
            onChange={(value) =>
              useEnvironmentStore.getState().setMultiHeadAreaHeadCount(Number(value) as 3 | 4)
            }
            options={[
              { label: '3 heads', value: '3' },
              { label: '4 heads', value: '4' },
            ]}
            value={String(multiHeadAreaHeadCount)}
          />
          <ToggleControl
            checked={multiHeadAreaLightOn}
            label="Lamps on"
            onChange={useEnvironmentStore.getState().setMultiHeadAreaLightOn}
          />
        </div>
      )}
      {panelCategory === 'lighting' && trussRoadwayLightArmed && (
        <div className="flex flex-col gap-0.5">
          <SliderControl
            label="Height"
            max={STANDARD_LAMP_HEIGHT_MAX_M}
            min={STANDARD_LAMP_HEIGHT_MIN_M}
            onChange={useEnvironmentStore.getState().setTrussRoadwayHeight}
            precision={2}
            restoreOnCommit={false}
            step={0.1}
            unit="m"
            value={trussRoadwayHeight}
          />
          <SliderControl
            label="Arm"
            max={3.5}
            min={0.8}
            onChange={useEnvironmentStore.getState().setTrussRoadwayArmLength}
            precision={2}
            restoreOnCommit={false}
            step={0.1}
            unit="m"
            value={trussRoadwayArmLength}
          />
          <SliderControl
            label="Brace depth"
            max={1.2}
            min={0.35}
            onChange={useEnvironmentStore.getState().setTrussRoadwayBraceDepth}
            precision={2}
            restoreOnCommit={false}
            step={0.05}
            unit="m"
            value={trussRoadwayBraceDepth}
          />
          <ToggleControl
            checked={trussRoadwayLightOn}
            label="Lamp on"
            onChange={useEnvironmentStore.getState().setTrussRoadwayLightOn}
          />
        </div>
      )}
      {panelCategory === 'lighting' && catalogLampArmed && (
        <div className="flex flex-col gap-0.5">
          <p className="px-2 pt-1 text-sidebar-foreground/55 text-xs">
            Shared {activeCatalogVariant?.family ?? 'lamp'} family style
          </p>
          <SegmentedControl
            onChange={useEnvironmentStore.getState().setCatalogLampVisualStyle}
            options={catalogLampStyleOptions.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            value={catalogLampVisualStyle}
          />
          <SliderControl
            label="Height"
            max={STANDARD_LAMP_HEIGHT_MAX_M}
            min={STANDARD_LAMP_HEIGHT_MIN_M}
            onChange={useEnvironmentStore.getState().setCatalogLampHeight}
            precision={2}
            restoreOnCommit={false}
            step={0.1}
            unit="m"
            value={catalogLampHeight}
          />
          <SliderControl
            label="Reach / span"
            max={12}
            min={0.15}
            onChange={useEnvironmentStore.getState().setCatalogLampArmLength}
            precision={2}
            restoreOnCommit={false}
            step={0.1}
            unit="m"
            value={catalogLampArmLength}
          />
          <ToggleControl
            checked={catalogLampLightOn}
            label="Lamp on"
            onChange={useEnvironmentStore.getState().setCatalogLampLightOn}
          />
        </div>
      )}
      {panelCategory === 'utilities' && utilityPoleArmed && (
        <div className="flex flex-col gap-0.5">
          <SliderControl
            label="Height"
            max={15.85}
            min={7.62}
            onChange={useEnvironmentStore.getState().setUtilityPoleHeight}
            precision={2}
            restoreOnCommit={false}
            step={0.01}
            unit="m"
            value={utilityPoleHeight}
          />
          <SliderControl
            label="Crossarm"
            max={3.66}
            min={STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M}
            onChange={useEnvironmentStore.getState().setUtilityPoleCrossarmLength}
            precision={2}
            restoreOnCommit={false}
            step={0.01}
            unit="m"
            value={utilityPoleCrossarmLength}
          />
          <span className="px-2 pt-2 font-medium text-sidebar-foreground/55 text-xs">
            Assembly
          </span>
          <SegmentedControl
            onChange={(value) =>
              useEnvironmentStore.getState().setUtilityPoleAssembly(value as UtilityPoleAssembly)
            }
            options={[
              { label: 'Tangent', value: 'tangent' },
              { label: 'Small angle', value: 'small-angle' },
              { label: 'Tap junction', value: 'junction' },
              { label: 'Dead-end', value: 'dead-end' },
            ]}
            value={utilityPoleAssembly}
          />
          <ToggleControl
            checked={utilityPoleTransformerMounted}
            label="Transformer"
            onChange={useEnvironmentStore.getState().setUtilityPoleTransformerMounted}
          />
          <p className="px-2 pt-2 text-sidebar-foreground/45 text-xs">
            Inserts into a nearby line or branches to the nearest pole within{' '}
            {STANDARD_UTILITY_POLE_AUTO_CONNECT_DISTANCE_M.toFixed(1)} m.
          </p>
        </div>
      )}
      {panelCategory === 'roads' && !roadSignArmed && (
        <div className="flex flex-col gap-0.5">
          <span className="pt-1 font-medium text-sidebar-foreground/65 text-xs">Road settings</span>
          <span className="px-2 pt-1 text-sidebar-foreground/55 text-xs">Drawing path</span>
          <SegmentedControl
            onChange={(value) =>
              useEnvironmentStore.getState().setRoadPathMode(value as 'spline' | 'orthogonal')
            }
            options={[
              { label: 'Straight / L', value: 'orthogonal' },
              { label: 'Curved / spline', value: 'spline' },
            ]}
            value={roadPathMode}
          />
          <SliderControl
            label="Width"
            max={40}
            min={1}
            onChange={useEnvironmentStore.getState().setRoadWidth}
            precision={2}
            restoreOnCommit={false}
            step={0.25}
            unit="m"
            value={roadWidth}
          />
          <SliderControl
            label="Lanes"
            max={6}
            min={1}
            onChange={useEnvironmentStore.getState().setRoadLaneCount}
            precision={0}
            restoreOnCommit={false}
            step={1}
            value={roadLaneCount}
          />
          <SegmentedControl
            onChange={(value) =>
              useEnvironmentStore.getState().setRoadCenterLineStyle(
                value as 'none' | 'single' | 'double' | 'dashed',
              )
            }
            options={[
              { label: 'No center', value: 'none' },
              { label: 'Single', value: 'single' },
              { label: 'Double', value: 'double' },
              { label: 'Dashed', value: 'dashed' },
            ]}
            value={roadCenterLineStyle}
          />
          <ToggleControl
            checked={roadEdgeLines}
            label="Edge lines"
            onChange={useEnvironmentStore.getState().setRoadEdgeLines}
          />
          <p className="px-2 pt-2 text-sidebar-foreground/45 text-xs">
            {roadPathMode === 'orthogonal'
              ? 'Click endpoints to create straight or L-shaped segments. Double-click or press Enter to finish.'
              : 'Click two or more points. Double-click or press Enter to finish. Backspace removes the last point.'}
          </p>
        </div>
      )}
      {panelCategory === 'roads' && roadSignArmed && (
        <div className="flex flex-col gap-0.5">
          <SliderControl
            label="Post height"
            max={4.5}
            min={1.2}
            onChange={useEnvironmentStore.getState().setRoadSignPostHeight}
            precision={2}
            restoreOnCommit={false}
            step={0.05}
            unit="m"
            value={roadSignPostHeight}
          />
          <SliderControl
            label="Sign scale"
            max={2.5}
            min={0.5}
            onChange={useEnvironmentStore.getState().setRoadSignScale}
            precision={2}
            restoreOnCommit={false}
            step={0.05}
            value={roadSignScale}
          />
          <SegmentedControl
            onChange={(value) =>
              useEnvironmentStore.getState().setRoadSignMounting(value as 'single-post' | 'double-post')
            }
            options={[
              { label: 'Single post', value: 'single-post' },
              { label: 'Double post', value: 'double-post' },
            ]}
            value={roadSignMounting}
          />
        </div>
      )}
    </div>
  )
}
