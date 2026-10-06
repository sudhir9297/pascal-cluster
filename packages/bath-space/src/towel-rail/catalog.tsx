'use client'
import { useEditor } from '@pascal-app/editor'
import PresetCatalog from '../shower-common/preset-catalog'
import { TOWEL_RAIL, towelRailPresets } from './schema'
import { useTowelRailPlacementShape, setTowelRailPlacementShape } from './placement-settings'
const thumbnails: Record<string, string> = {
  single: new URL('./assets/single.webp', import.meta.url).href,
  double: new URL('./assets/double.webp', import.meta.url).href,
}
export function TowelRailPreview({ shape = 'single' }: { shape?: string }) {
  return <img alt="" src={thumbnails[shape] ?? thumbnails.single} loading="lazy" className="h-full w-full object-contain" />
}
export default function TowelRailCatalog({query}:{query:string}) {
  const shape = useTowelRailPlacementShape(), active = useEditor(state=>state.tool===TOWEL_RAIL)
  return <PresetCatalog title="Towel rails" prefix={TOWEL_RAIL} items={towelRailPresets.map(p=>({id:p.shape,label:p.label}))}
    query={query} selectedId={shape} active={active}
    onSelect={id=>{setTowelRailPlacementShape(id as typeof shape);useEditor.getState().setTool(TOWEL_RAIL)}}
    renderPreview={id=><TowelRailPreview shape={id}/>} hint="Click a wall to place."/>
}
