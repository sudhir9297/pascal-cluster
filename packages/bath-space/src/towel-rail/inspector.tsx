'use client'
import { getWallEffectiveHeightForNodes, useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { PanelSection, PanelWrapper, PanelSelect, PanelButton, SliderControl } from '../inspector-controls'
import { TowelRailNode, towelRailPresets } from './schema'
import { towelRailPlacement } from './placement'
import { towelRailPaint } from './finishes'
import { SectionAccordion } from '../section/section-card'
import { accessorySection } from './section'
import { SlotFinishSelect } from '../workspace/slot-finish-select'
export default function TowelRailInspector({node}:{node:TowelRailNode}) {
  const n = TowelRailNode.parse(node), select = useViewer(s=>s.setSelection)
  const nodes = useScene(state=>state.nodes)
  const host = nodes[(n.wallId??n.parentId) as AnyNodeId]
  const wallHeight = host?.type==='wall' ? getWallEffectiveHeightForNodes(host,nodes) : 5
  const wallLength = host?.type==='wall' ? Math.hypot(host.end[0]-host.start[0],host.end[1]-host.start[1]) : null
  const halfHeight = n.height/2
  const fits = host?.type!=='wall' || towelRailPlacement(n,{...host,visible:true},n.position[0],n.side,0,false,nodes)!==null
  const update = (patch:Partial<TowelRailNode>) => {
    const next = TowelRailNode.parse({...n,...patch})
    const wall = useScene.getState().nodes[(next.wallId??next.parentId) as AnyNodeId]
    const placed = wall?.type==='wall' ? towelRailPlacement(next,wall,next.position[0],next.side,0,false,useScene.getState().nodes) : null
    if (wall?.type==='wall' && !placed) return
    useScene.getState().updateNode(n.id as AnyNodeId,{...patch,...placed} as Partial<AnyNode>)
  }
  return <PanelWrapper title="Towel rail" onClose={()=>select({selectedIds:[]})}>
    <SectionAccordion node={n} model={accessorySection} onChange={update} />
    {!fits && <p role="status" className="px-3 py-2 text-xs text-muted-foreground">Towel rail extends beyond its wall. Reduce its size or adjust its centre height.</p>}
    <PanelSection title="Design" defaultExpanded>
      <label className="flex items-center justify-between gap-3 px-3 text-xs">Style<PanelSelect aria-label="Towel rail style" value={n.shape} onChange={e=>update({shape:e.target.value as TowelRailNode['shape']})}>
        {towelRailPresets.map(p=><option key={p.shape} value={p.shape}>{p.label}</option>)}
      </PanelSelect></label>

    </PanelSection>
    <PanelSection title="Dimensions and mounting" defaultExpanded>
      <SliderControl label="Height from floor" value={n.mountingHeight} min={halfHeight} max={Math.max(halfHeight,wallHeight-halfHeight)} step={.01} precision={2} unit="m" onChange={mountingHeight=>update({mountingHeight})}/>
      {wallLength!==null && wallLength>=n.width && <SliderControl
        label="Position along wall" value={n.position[0]} min={n.width/2} max={wallLength-n.width/2}
        step={0.01} precision={2} unit="m"
        onChange={station=>update({position:[station,n.position[1],n.position[2]]})}
      />}
      <PanelButton onClick={()=>update({side:n.side==='front'?'back':'front'})}>Switch wall face</PanelButton>
    </PanelSection>
    <PanelSection title="Finish" defaultExpanded>
      <SlotFinishSelect node={n as unknown as AnyNode} paint={towelRailPaint} role="metal"
        label="Rail and brackets" ariaLabel="Towel rail finish" defaultLabel="Default chrome" categories={['metal']} />
    </PanelSection>
  </PanelWrapper>
}
