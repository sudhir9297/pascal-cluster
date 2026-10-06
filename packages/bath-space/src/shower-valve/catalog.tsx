'use client'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { SHOWER_VALVE, showerValvePresets } from './schema'
import { setShowerValvePreset, useShowerValvePreset } from './placement-settings'
import PressureBalanceThumbnail from './assets/pressure-balance.webp'
import PressureBalanceStopsThumbnail from './assets/pressure-balance-stops.webp'
import ThermostaticThumbnail from './assets/thermostatic.webp'
import TransferThumbnail from './assets/transfer.webp'
import StopThumbnail from './assets/stop.webp'
import UniversalThumbnail from './assets/universal.webp'

type ThumbnailAsset = string | { src: string }
const thumbnailSrc = (asset: ThumbnailAsset | undefined) => typeof asset === 'string' ? asset : asset?.src
const showerValveThumbnails: Record<string, ThumbnailAsset> = {
  'pressure-balance': PressureBalanceThumbnail,
  'pressure-balance-stops': PressureBalanceStopsThumbnail,
  'thermostatic': ThermostaticThumbnail,
  'transfer': TransferThumbnail,
  'stop': StopThumbnail,
  'universal': UniversalThumbnail,
}
export default function ShowerValveCatalog({ query }: { query: string }) {
  const selected = useShowerValvePreset(),
    active = useEditor((s) => s.tool === SHOWER_VALVE)
  return (
    <ShowerPresetCatalog
      title="Concealed valve"
      prefix="shower-valve"
      items={showerValvePresets}
      families={(
        ['pressure-balance', 'thermostatic', 'transfer', 'stop', 'universal'] as const
      ).map((family) => ({
        id: family,
        label: {
          'pressure-balance': 'Pressure-balancing valve',
          thermostatic: 'Thermostatic valve',
          transfer: 'Transfer valve',
          stop: 'Stop valve',
          universal: 'Installation box',
        }[family],
        itemIds: showerValvePresets.filter((p) => p.family === family).map((p) => p.id),
      }))}
      query={query}
      selectedId={selected}
      active={active}
      onSelect={(id) => {
        setShowerValvePreset(id)
        useEditor.getState().setTool(SHOWER_VALVE)
      }}
      hint="Click compatible concealed trim to attach."
      renderPreview={(id) => (
        <img src={thumbnailSrc(showerValveThumbnails[id])} alt="" className="h-full w-full object-contain p-1" />
      )}
    />
  )
}
