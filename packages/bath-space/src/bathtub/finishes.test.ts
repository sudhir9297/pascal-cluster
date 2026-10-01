import {expect,test} from 'bun:test'
import {Mesh,MeshStandardMaterial,Raycaster,Vector3} from 'three'
import {BathtubNode,bathtubPresets} from './schema'
import {buildBathtubGeometry} from './geometry'

test('bath interiors and exteriors occupy separate paintable surfaces across every shape',()=>{
 for(const preset of bathtubPresets){
  const node=BathtubNode.parse({...preset}),group=buildBathtubGeometry(node)
  const interior:Mesh[]=[],exterior:Mesh[]=[]
  group.traverse(o=>{if(o instanceof Mesh){if(o.userData.slotId==='interior')interior.push(o);if(o.userData.slotId==='shell')exterior.push(o)}})
  expect(interior.length).toBeGreaterThan(0);expect(exterior.length).toBeGreaterThan(0)
  for(const mesh of [...interior,...exterior]){expect((mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count)).toBeGreaterThan(0);expect(mesh.geometry.getAttribute('uv')).toBeDefined()}
 }
})
test('a two-tone clawfoot bath exposes white well surfaces and independently paintable exterior and feet',()=>{
 const node=BathtubNode.parse({shape:'clawfoot'}),group=buildBathtubGeometry(node)
 group.updateMatrixWorld(true)
 const down=new Raycaster(new Vector3(.2,2,0),new Vector3(0,-1,0)).intersectObject(group,true).filter(h=>h.object instanceof Mesh)
 expect(down[0]!.object.userData.slotId).toBe('interior')
 const side=new Raycaster(new Vector3(0,.4,-2),new Vector3(0,0,1)).intersectObject(group,true).filter(h=>h.object instanceof Mesh)
 expect(side[0]!.object.userData.slotId).toBe('shell')
 let feet=0;group.traverse(o=>{if(o instanceof Mesh&&o.userData.slotId==='base')feet++});expect(feet).toBeGreaterThan(0)
})

test('painting one bath surface preserves other finishes after rebuilding',async()=>{
 const {useScene,MaterialSchema}=await import('@pascal-app/core')
 const {bathPaint}=await import('./finishes')
 const original=useScene.getState(),node=BathtubNode.parse({shape:'clawfoot',showPlumbing:true}),id=node.id as never
 useScene.setState({nodes:{[node.id]:node as never},materials:{},readOnly:false})
 try{
  for(const [role,color] of [['shell','#202327'],['interior','#ffffff'],['base','#ba9250'],['plumbing','#ccd2d6']] as const)
   bathPaint.commit!({node:node as never,role,material:MaterialSchema.parse({properties:{color}}),materialPreset:undefined})
  const state=useScene.getState(),painted=BathtubNode.parse(state.nodes[id]),group=buildBathtubGeometry(painted,{materials:state.materials} as never)
  const expected={shell:'202327',interior:'ffffff',base:'ba9250',plumbing:'ccd2d6'}
  group.traverse(o=>{if(o instanceof Mesh&&o.userData.slotId in expected)expect((o.material as MeshStandardMaterial).color.getHexString()).toBe(expected[o.userData.slotId as keyof typeof expected])})
  bathPaint.commit!({node:node as never,role:'interior',materialPreset:undefined})
  const reset=BathtubNode.parse(useScene.getState().nodes[id]);expect(reset.slots?.shell).toBe(painted.slots?.shell);expect(reset.slots?.base).toBe(painted.slots?.base);expect(reset.slots?.interior).toBeUndefined()
 }finally{useScene.setState(original)}
})
