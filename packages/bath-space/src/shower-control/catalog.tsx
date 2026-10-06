'use client'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import {
  SHOWER_CONTROL,
  showerControlPresets,
  controlPresetNode,
  exposedControl,
  type ShowerControlNode,
} from './schema'
import {
  setShowerControlPreset,
  useShowerControlPreset,
  type ControlPresetId,
} from './placement-settings'
import RoundLeverThumbnail from './assets/round-lever.webp'
import SquareLeverThumbnail from './assets/square-lever.webp'
import DualRoundThumbnail from './assets/dual-round.webp'
import DualSquareThumbnail from './assets/dual-square.webp'
import ButtonTrimThumbnail from './assets/button-trim.webp'
import BarRoundThumbnail from './assets/bar-round.webp'
import BarSquareThumbnail from './assets/bar-square.webp'
import BridgeCrossThumbnail from './assets/bridge-cross.webp'
import RoundDiverterThumbnail from './assets/round-diverter.webp'
import SquareDiverterThumbnail from './assets/square-diverter.webp'
import RoundFlowThumbnail from './assets/round-flow.webp'
import SquareFlowThumbnail from './assets/square-flow.webp'
import BathBridgeRoundThumbnail from './assets/bath-bridge-round.webp'
import BathBridgeSquareThumbnail from './assets/bath-bridge-square.webp'
import BathSingleRoundThumbnail from './assets/bath-single-round.webp'
import BathSingleSquareThumbnail from './assets/bath-single-square.webp'
import BathThermostatThumbnail from './assets/bath-thermostat.webp'
import BathWaterfallThumbnail from './assets/bath-waterfall.webp'

type ThumbnailAsset = string | { src: string }
const thumbnailSrc = (asset: ThumbnailAsset | undefined) => typeof asset === 'string' ? asset : asset?.src

const showerControlThumbnails: Record<ControlPresetId, ThumbnailAsset> = {
  'round-lever': RoundLeverThumbnail,
  'square-lever': SquareLeverThumbnail,
  'dual-round': DualRoundThumbnail,
  'dual-square': DualSquareThumbnail,
  'button-trim': ButtonTrimThumbnail,
  'bar-round': BarRoundThumbnail,
  'bar-square': BarSquareThumbnail,
  'bridge-cross': BridgeCrossThumbnail,
  'round-diverter': RoundDiverterThumbnail,
  'square-diverter': SquareDiverterThumbnail,
  'round-flow': RoundFlowThumbnail,
  'square-flow': SquareFlowThumbnail,
  'bath-bridge-round': BathBridgeRoundThumbnail,
  'bath-bridge-square': BathBridgeSquareThumbnail,
  'bath-single-round': BathSingleRoundThumbnail,
  'bath-single-square': BathSingleSquareThumbnail,
  'bath-thermostat': BathThermostatThumbnail,
  'bath-waterfall': BathWaterfallThumbnail,
}
export function ShowerControlPreview({
  preset = 'round-lever',
  node,
}: {
  preset?: ControlPresetId
  node?: ShowerControlNode
}) {
  const n = node ?? controlPresetNode(showerControlPresets.find((p) => p.id === preset)!),
    exposed = exposedControl(n)
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 88 64"
      className="h-full w-full p-2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      {exposed ? (
        <>
          <path d="M19 18v12M69 18v12" />
          <rect x="10" y="28" width="68" height="14" rx={n.plateShape === 'square' ? 0 : 7} />
          {n.layout === 'bath-single' ? (
            <path d="M44 28v-12h12" />
          ) : (
            <path d="M18 27v15M70 27v15" />
          )}
          {n.hoseOutletEnabled && <path d="M60 42v9" />}
          {n.spoutEnabled && (
            <path d={n.spoutStyle.startsWith('waterfall') ? 'M32 42v14h24V42' : 'M40 42v14h8V42'} />
          )}
          {n.riserEnabled && <path d="M44 28v-16" />}
        </>
      ) : (
        <>
          {n.plateShape === 'round' ? (
            <circle cx="44" cy="32" r="24" />
          ) : (
            <rect
              x="24"
              y={n.plateShape === 'square' ? 12 : 6}
              width="40"
              height={n.plateShape === 'square' ? 40 : 52}
              rx={n.plateShape === 'soft-rectangle' ? 4 : 0}
            />
          )}
          {'layout' in n && n.layout === 'dual' ? (
            <>
              <circle cx="44" cy="22" r="8" />
              <circle cx="44" cy="43" r="8" />
            </>
          ) : 'layout' in n && n.layout === 'buttons' ? (
            <>
              <rect x="32" y="16" width="9" height="9" />
              <rect x="47" y="16" width="9" height="9" />
              <circle cx="44" cy="43" r="9" />
            </>
          ) : (
            <>
              <circle cx="44" cy="30" r="9" />
              {n.handleStyle === 'lever' ? (
                <path d="M44 30v20" />
              ) : n.handleStyle === 'cross' ? (
                <path d="M44 19v22M33 30h22" />
              ) : (
                <path d="M44 22v4" />
              )}
            </>
          )}
        </>
      )}
    </svg>
  )
}
export default function ShowerControlCatalog({ query }: { query: string }) {
  const preset = useShowerControlPreset()
  const active = useEditor((s) => s.tool === SHOWER_CONTROL)
  return (
    <ShowerPresetCatalog
      title="Shower controls"
      prefix="shower-control"
      items={showerControlPresets}
      query={query}
      selectedId={preset}
      active={active}
      families={[
        {
          id: 'concealed',
          label: 'Concealed control',
          itemIds: showerControlPresets
            .filter((p) => !exposedControl(controlPresetNode(p)))
            .map((p) => p.id),
        },
        {
          id: 'exposed',
          label: 'Exposed mixer',
          itemIds: showerControlPresets
            .filter((p) => exposedControl(controlPresetNode(p)))
            .map((p) => p.id),
        },
      ]}
      onSelect={(id) => {
        setShowerControlPreset(id as ControlPresetId)
        useEditor.getState().setTool(SHOWER_CONTROL)
      }}
      renderPreview={(id) => (
        <img src={thumbnailSrc(showerControlThumbnails[id as ControlPresetId])} alt="" className="h-full w-full object-contain p-1" />
      )}
      hint="Click a wall to place."
    />
  )
}
