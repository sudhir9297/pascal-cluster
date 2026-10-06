'use client'
import { getWallEffectiveHeightForNodes, useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { PanelSection, PanelWrapper, PanelSelect, PanelButton, SliderControl } from '../inspector-controls'
import { WallLightNode } from './schema'
import { wallLightPlacement } from './placement'
import { wallLightPaint } from './finishes'
import { SectionAccordion } from '../section/section-card'
import { accessorySection } from './section'
import { SlotFinishSelect } from '../workspace/slot-finish-select'
export default function WallLightInspector({node}:{node:WallLightNode}) {
  const n = WallLightNode.parse(node), select = useViewer(s=>s.setSelection)
  const nodes = useScene(state=>state.nodes)
  const host = nodes[(n.wallId??n.parentId) as AnyNodeId]
  const wallHeight = host?.type==='wall' ? getWallEffectiveHeightForNodes(host,nodes) : 5
  const wallLength = host?.type==='wall' ? Math.hypot(host.end[0]-host.start[0],host.end[1]-host.start[1]) : null
  const halfHeight = n.height/2
  const fits = host?.type!=='wall' || wallLightPlacement(n,{...host,visible:true},n.position[0],n.side,0,false,nodes)!==null
  const update = (patch:Partial<WallLightNode>) => {
    const next = WallLightNode.parse({...n,...patch})
    const wall = useScene.getState().nodes[(next.wallId??next.parentId) as AnyNodeId]
    const placed = wall?.type==='wall' ? wallLightPlacement(next,wall,next.position[0],next.side,0,false,useScene.getState().nodes) : null
    if (wall?.type==='wall' && !placed) return
    useScene.getState().updateNode(n.id as AnyNodeId,{...patch,...placed} as Partial<AnyNode>)
  }
  return <PanelWrapper title="Bathroom light" onClose={()=>select({selectedIds:[]})}>
    <SectionAccordion node={n} model={accessorySection} onChange={update} />
    {!fits && <p role="status" className="px-3 py-2 text-xs text-muted-foreground">Light extends beyond its wall. Reduce its size or adjust its centre height.</p>}
    <PanelSection title="Light" defaultExpanded>
      <label className="flex items-center gap-2 px-3 text-xs"><input type="checkbox" aria-label="Bathroom light on" checked={n.enabled} onChange={e=>update({enabled:e.target.checked})}/>Light on</label>
      <label className="flex items-center justify-between gap-3 px-3 text-xs">Colour temperature<PanelSelect aria-label="Bathroom light temperature" value={n.temperature} onChange={e=>update({temperature:e.target.value as WallLightNode['temperature']})}>
        <option value="warm">Warm · 2700 K</option><option value="neutral">Neutral · 4000 K</option><option value="cool">Cool · 6500 K</option>
      </PanelSelect></label>
      <SliderControl label="Brightness" value={n.brightness} min={0} max={100} step={1} precision={0} unit="%" onChange={brightness=>update({brightness})}/>
      <p className="px-3 py-2 text-xs text-muted-foreground">Visual lighting preview; brightness is not a lux calculation or a product rating.</p>
    </PanelSection>
    <PanelSection title="Dimensions and mounting" defaultExpanded>
      {(['mountingHeight'] as (keyof Pick<WallLightNode,'width'|'height'|'depth'|'mountingHeight'>)[]).map(key=><SliderControl key={key}
        label={key==='width'?'Width':key==='height'?'Height':key==='depth'?'Depth':'Centre height from floor'}
        value={n[key]} min={key==='mountingHeight'?halfHeight:key==='depth'?0.03:key==='height'?0.04:0.2}
        max={key==='depth'?0.2:key==='height'?0.3:key==='mountingHeight'?Math.max(halfHeight,wallHeight-halfHeight):1.5}
        step={0.01} precision={2} unit="m" onChange={value=>update({[key]:value})}/>)}
      {wallLength!==null && wallLength>=n.width && <SliderControl
        label="Position along wall" value={n.position[0]} min={n.width/2} max={wallLength-n.width/2}
        step={0.01} precision={2} unit="m"
        onChange={station=>update({position:[station,n.position[1],n.position[2]]})}
      />}
      <PanelButton onClick={()=>update({side:n.side==='front'?'back':'front'})}>Switch wall face</PanelButton>
    </PanelSection>
    <PanelSection title="Finish" defaultExpanded>
      <SlotFinishSelect node={n as unknown as AnyNode} paint={wallLightPaint} role="housing"
        label="Housing" ariaLabel="Bathroom light housing finish" defaultLabel="Default dark housing" categories={['metal']} />
    </PanelSection>
  </PanelWrapper>
}
