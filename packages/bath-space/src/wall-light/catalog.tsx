'use client'
import { useEditor } from '@pascal-app/editor'
import PresetCatalog from '../shower-common/preset-catalog'
import { WALL_LIGHT, wallLightPresets } from './schema'
import { useWallLightPlacementShape, setWallLightPlacementShape } from './placement-settings'
const thumbnails: Record<string, string> = {
  bar: new URL('./assets/bar.webp', import.meta.url).href,
}
export function WallLightPreview({ shape = 'bar' }: { shape?: string }) {
  return <img alt="" src={thumbnails[shape] ?? thumbnails.bar} loading="lazy" className="h-full w-full object-contain" />
}
export default function WallLightCatalog({query}:{query:string}) {
  const shape = useWallLightPlacementShape(), active = useEditor(state=>state.tool===WALL_LIGHT)
  return <PresetCatalog title="Lights" prefix={WALL_LIGHT} items={wallLightPresets.map(p=>({id:p.shape,label:p.label}))}
    query={query} selectedId={shape} active={active}
    onSelect={id=>{setWallLightPlacementShape(id as typeof shape);useEditor.getState().setTool(WALL_LIGHT)}}
    renderPreview={id=><WallLightPreview shape={id}/>} hint="Click a wall to place."/>
}
