import {expect,test} from 'bun:test'
import {useScene,MaterialSchema} from '@pascal-app/core'
import {Mesh, type MeshStandardMaterial} from 'three'
import {MirrorNode} from './schema'
import {mirrorPaint} from './finishes'
import {buildMirrorGeometry} from './geometry'
test('mirror frame and surface finishes survive serialization independently and resetting restores metallic glass',()=>{
 const original=useScene.getState(),node=MirrorNode.parse({})
 useScene.setState({nodes:{[node.id]:node as never},materials:{},readOnly:false})
 try{
  for(const [role,color] of [['frame','#ba9250'],['glass','#ccd2d6']] as const)
   mirrorPaint.commit!({node:node as never,role,material:MaterialSchema.parse({properties:{color}})})
  const state=useScene.getState(),painted=MirrorNode.parse(JSON.parse(JSON.stringify(state.nodes[node.id as never])))
  const root=buildMirrorGeometry(painted,{materials:state.materials} as never)
  root.traverse(object=>{if(object instanceof Mesh && object.userData.slotId!=='backing')expect((object.material as MeshStandardMaterial).color.getHexString()).toBe(object.userData.slotId==='frame'?'ba9250':'ccd2d6')})
  mirrorPaint.commit!({node:painted as never,role:'glass'})
  const reset=MirrorNode.parse(useScene.getState().nodes[node.id as never])
  expect(reset.slots?.frame).toBe(painted.slots?.frame)
  expect(reset.slots?.glass).toBeUndefined()
  buildMirrorGeometry(reset).traverse(object=>{if(object instanceof Mesh && object.userData.slotId==='glass')expect((object.material as MeshStandardMaterial).metalness).toBe(1)})
 }finally{useScene.setState(original,true)}
})
