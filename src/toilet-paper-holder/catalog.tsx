'use client'
import {useEditor} from '@pascal-app/editor'
import {TOILET_PAPER_HOLDER,holderPresets} from './schema'
import {useHolderPlacementShape,setHolderPlacementShape} from './placement-settings'
const thumbnails: Record<string,string> = {
  open:new URL('./assets/open.png',import.meta.url).href,
  double:new URL('./assets/double.png',import.meta.url).href,
  covered:new URL('./assets/covered.png',import.meta.url).href,
}
export function HolderPreview({shape='open'}:{shape?:string}) {
  return <img src={thumbnails[shape] ?? thumbnails.open} alt="" loading="lazy" className="h-full w-full object-contain p-1"/>
}
export default function HolderCatalog({query}: {query:string}) {
  const shape=useHolderPlacementShape(), active=useEditor(s=>s.tool===TOILET_PAPER_HOLDER)
  const visible=holderPresets.filter(p=>`toilet paper roll holder ${p.label}`.toLowerCase().includes(query.trim().toLowerCase()))
  if(!visible.length) return null
  return <section className="space-y-2 border-t border-border/60 pt-3"><h3 className="text-xs font-semibold">Toilet paper holder</h3>
    <div className="grid grid-cols-3 gap-2">{visible.map(p=><button key={p.shape} aria-label={`Add ${p.label} paper holder`} aria-pressed={active && shape===p.shape} onClick={()=>{setHolderPlacementShape(p.shape);useEditor.getState().setTool(TOILET_PAPER_HOLDER)}} className={`overflow-hidden rounded-lg border text-left ${active && shape===p.shape?'border-primary':'border-border hover:bg-accent'}`}>
      <span className="flex aspect-[7/4]"><HolderPreview shape={p.shape}/></span>
      <span className="block min-h-8 px-2 py-1.5 text-[11px] font-medium">{p.label}</span></button>)}</div>
    {active && <p role="status" className="text-[11px] text-muted-foreground">Click a wall to place. Esc to cancel.</p>}
  </section>
}
