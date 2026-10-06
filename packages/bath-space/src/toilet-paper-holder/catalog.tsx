'use client'
import {useEditor} from '@pascal-app/editor'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import {TOILET_PAPER_HOLDER,holderPresets} from './schema'
import {useHolderPlacementShape,setHolderPlacementShape} from './placement-settings'
const thumbnails: Record<string,string> = {
  open:new URL('./assets/open.webp',import.meta.url).href,
  double:new URL('./assets/double.webp',import.meta.url).href,
  covered:new URL('./assets/covered.webp',import.meta.url).href,
}
export function HolderPreview({shape='open'}:{shape?:string}) {
  return <img src={thumbnails[shape] ?? thumbnails.open} alt="" loading="lazy" className="h-full w-full object-contain p-1"/>
}
export default function HolderCatalog({query}: {query:string}) {
  const shape = useHolderPlacementShape()
  const active = useEditor(state => state.tool === TOILET_PAPER_HOLDER)
  return <ShowerPresetCatalog
    title="Toilet paper holder"
    prefix={TOILET_PAPER_HOLDER}
    items={holderPresets.map(preset => ({ id: preset.shape, label: `${preset.label} paper holder` }))}
    query={query}
    selectedId={shape}
    active={active}

    onSelect={id => {
      setHolderPlacementShape(id as typeof shape)
      useEditor.getState().setTool(TOILET_PAPER_HOLDER)
    }}
    renderPreview={id => <HolderPreview shape={id} />}
    hint="Click a wall to place."
  />
}
