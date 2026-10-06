'use client'
import { useEditor } from '@pascal-app/editor'
import PresetCatalog from '../shower-common/preset-catalog'
import { MIRROR, mirrorPresets, type MirrorNode } from './schema'
import { useMirrorPlacementShape, setMirrorPlacementShape } from './placement-settings'
const mirrorThumbnails: Record<MirrorNode['shape'], string> = {
  rectangle: new URL('./assets/rectangle.webp', import.meta.url).href,
  round: new URL('./assets/round.webp', import.meta.url).href,
  rounded: new URL('./assets/rounded.webp', import.meta.url).href,
  oval: new URL('./assets/oval.webp', import.meta.url).href,
  pill: new URL('./assets/pill.webp', import.meta.url).href,
  arch: new URL('./assets/arch.webp', import.meta.url).href,
}
export function MirrorPreview({shape='rectangle'}:{shape?:string}) {
  const thumbnail = mirrorThumbnails[shape as MirrorNode['shape']] ?? mirrorThumbnails.rectangle
  return <img src={thumbnail} alt="" loading="lazy" className="h-full w-full object-contain" />
}
export default function MirrorCatalog({query}:{query:string}) {
  const shape = useMirrorPlacementShape(), active = useEditor(state=>state.tool===MIRROR)
  return <PresetCatalog title="Mirrors" prefix={MIRROR} items={mirrorPresets.map(p=>({id:p.shape,label:p.label}))}
    query={query} selectedId={shape} active={active}
    onSelect={id=>{setMirrorPlacementShape(id as typeof shape);useEditor.getState().setTool(MIRROR)}}
    renderPreview={id=><MirrorPreview shape={id}/>} hint="Click a wall to place."/>
}
