'use client'
import { getWallEffectiveHeightForNodes, useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { PanelSection, PanelWrapper, PanelSelect, PanelButton, SliderControl, ToggleControl } from '../inspector-controls'
import { SectionAccordion } from '../section/section-card'
import { MirrorNode, mirrorPresets } from './schema'
import { mirrorEdit } from './handles'
import { mirrorPaint } from './finishes'
import { mirrorSection } from './section'
import { SlotFinishSelect } from '../workspace/slot-finish-select'
export default function MirrorInspector({node}:{node:MirrorNode}) {
 const n=MirrorNode.parse(node), select=useViewer(s=>s.setSelection), nodes=useScene(s=>s.nodes), readOnly=useScene(s=>s.readOnly)
 const host=nodes[(n.wallId??n.parentId) as AnyNodeId], wallHeight=host?.type==='wall'?getWallEffectiveHeightForNodes(host,nodes):5
 const wallLength=host?.type==='wall'?Math.hypot(host.end[0]-host.start[0],host.end[1]-host.start[1]):2.4
 const update=(patch:Partial<MirrorNode>)=>{if(readOnly)return;const prepared=mirrorEdit(n,patch,{nodes:()=>useScene.getState().nodes});if(Object.keys(prepared).length)useScene.getState().updateNode(n.id as AnyNodeId,prepared as Partial<AnyNode>)}
 const slider=(key:'width'|'height'|'depth'|'frameWidth'|'cornerRadius'|'glassThickness'|'wallGap'|'mountingHeight'|'brightness',label:string,min:number,max:number,step=.001)=><SliderControl key={key} label={label} value={n[key]} min={min} max={Math.max(min,max)} step={step} precision={step>=1?0:step===.01?2:3} unit={key==='brightness'?'%':'m'} onChange={value=>update({[key]:value})}/>
 const choice=(key:'shape'|'frameProfile'|'surface'|'temperature',label:string,options:{value:string;label:string}[])=> <label className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">{label}<PanelSelect aria-label={`Mirror ${label.toLowerCase()}`} value={n[key]} disabled={readOnly} onChange={e=>{
  const patch={ [key]:e.target.value } as Partial<MirrorNode>
  if(key==='surface'){const {glass,...slots}=n.slots??{};patch.slots=slots}
  update(patch)
 }}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</PanelSelect></label>
 const halfHeight=n.height/2
 return <PanelWrapper title="Bathroom mirror" onClose={()=>select({selectedIds:[]})}>
  <SectionAccordion node={n} model={mirrorSection} onChange={update} preparePreview={patch=>mirrorEdit(n,patch,{nodes:()=>useScene.getState().nodes})}/>
  <PanelSection title="Design" defaultExpanded>
   {choice('shape','Shape',mirrorPresets.map(p=>({value:p.shape,label:p.label})))}
   <ToggleControl label="Frame" checked={n.frameEnabled} onChange={frameEnabled=>update({frameEnabled})}/>
   {n.shape==='rounded'&&slider('cornerRadius','Corner radius',.005,Math.min(.2,n.width/2,n.height/2))}
  </PanelSection>
  <PanelSection title="Dimensions" defaultExpanded>
   {slider('width',n.shape==='round'?'Diameter':'Width',.3,Math.min(2.4,wallLength,n.shape==='round'?2*Math.min(n.mountingHeight,wallHeight-n.mountingHeight):2.4),.01)}
   {n.shape!=='round'&&<>{slider('height','Height',.3,Math.min(2.4,2*Math.min(n.mountingHeight,wallHeight-n.mountingHeight)),.01)}<PanelButton disabled={readOnly} onClick={()=>update({width:n.height,height:n.width})}>Swap width and height</PanelButton></>}
   {slider('depth','Depth',.01,.08)}
   {slider('glassThickness','Glass thickness',.003,.01)}
  </PanelSection>
  {n.frameEnabled&&<PanelSection title="Frame" defaultExpanded>
   {choice('frameProfile','Profile',[{value:'flat',label:'Flat'},{value:'rounded',label:'Rounded'}])}
   {slider('frameWidth','Frame width',0,.08)}
  </PanelSection>}
  <PanelSection title="Mirror surface" defaultExpanded>
   {choice('surface','Surface',[{value:'silver',label:'Silver'},{value:'bronze',label:'Bronze'},{value:'smoked',label:'Smoked'}])}
   <ToggleControl label="Bevelled edge" checked={n.bevelEnabled} onChange={bevelEnabled=>update({bevelEnabled})}/>
   <SlotFinishSelect node={n as unknown as AnyNode} paint={mirrorPaint} role="glass" label="Surface material" ariaLabel="Mirror surface material" defaultLabel="Mirror surface" categories={['metal']}/>
  </PanelSection>
  <PanelSection title="Backlight" defaultExpanded>
   <ToggleControl label="Backlight" checked={n.backlight} onChange={backlight=>update({backlight,...(backlight?{wallGap:Math.max(.012,n.wallGap)}:{})})}/>
   {n.backlight&&<>{choice('temperature','Temperature',[{value:'warm',label:'Warm'},{value:'neutral',label:'Neutral'},{value:'cool',label:'Cool'}])}{slider('brightness','Brightness',0,100,1)}</>}
  </PanelSection>
  <PanelSection title="Mounting" defaultExpanded>
   {slider('mountingHeight','Centre height from floor',halfHeight,wallHeight-halfHeight,.01)}
   {slider('wallGap','Wall gap',0,.06)}
   {wallLength>=n.width&&<SliderControl label="Position along wall" value={n.position[0]} min={n.width/2} max={wallLength-n.width/2} step={.01} precision={2} unit="m" onChange={station=>update({position:[station,n.position[1],n.position[2]]})}/>}
   <PanelButton disabled={readOnly} onClick={()=>update({side:n.side==='front'?'back':'front'})}>Switch wall face</PanelButton>
  </PanelSection>
 </PanelWrapper>
}
