import { expect, test } from 'bun:test'
import { LevelNode, WallNode } from '@pascal-app/core'
import { Box3, Mesh } from 'three'
import { MirrorNode, mirrorPresets } from './schema'
import { buildMirrorGeometry } from './geometry'
import { mirrorPlacement } from './placement'
test('mirror presets have finite separate paint surfaces and stay in front of their wall',()=>{
  for (const preset of mirrorPresets) {
    const n=MirrorNode.parse(preset), root=buildMirrorGeometry(n), bounds=new Box3().setFromObject(root)
    expect(bounds.min.z).toBeGreaterThanOrEqual(-0.000001)
    expect(bounds.max.x-bounds.min.x).toBeCloseTo(n.width,5)
    expect(bounds.max.y-bounds.min.y).toBeCloseTo(n.shape==='round'?n.width:n.height,5)
    const slots=new Set<string>()
    root.traverse(object=>{if(object instanceof Mesh) slots.add(object.userData.slotId)})
    expect([...slots].sort()).toEqual(['backing','frame','glass'])
  }
})
test('mirror placement follows wall faces and rejects insufficient width or vertical space',()=>{
  const wall=WallNode.parse({start:[0,0],end:[3,0],height:2.5,thickness:0.2}), n=MirrorNode.parse({})
  expect(mirrorPlacement(n,wall,1,'front')?.position).toEqual([1,1.5,0.1])
  expect(mirrorPlacement(n,wall,1,'back')?.rotation).toBe(Math.PI)
  expect(mirrorPlacement({...n,mountingHeight:0.2},wall,1,'front')).toBeNull()
  expect(mirrorPlacement({...n,mountingHeight:2.3},wall,1,'front')).toBeNull()
  expect(mirrorPlacement({...n,width:2},WallNode.parse({start:[0,0],end:[1,0]}),0.5,'front')).toBeNull()
})

test('round mirror parsing normalizes serialized height to its actual diameter',()=>{
  const n=MirrorNode.parse({shape:'round',width:1.2,height:0.7})
  expect(n.height).toBe(1.2)
  expect(MirrorNode.parse(JSON.parse(JSON.stringify(n))).height).toBe(1.2)
})
test('mirror fitting uses inherited level height when wall height is omitted',()=>{
  const level=LevelNode.parse({height:2}), wall=WallNode.parse({parentId:level.id,start:[0,0],end:[3,0]})
  const n=MirrorNode.parse({mountingHeight:1.8})
  expect(mirrorPlacement(n,wall,1,'front',0,false,{[level.id]:level,[wall.id]:wall})).toBeNull()
})

test('all mirror shapes support framed and frameless geometry at size limits',()=>{
 for(const preset of mirrorPresets) for(const frameEnabled of [true,false]) for(const frameProfile of ['flat','rounded'] as const) for(const width of [.3,2.4]){
  const node=MirrorNode.parse({...preset,width,height:.3,frameEnabled,frameProfile,frameWidth:.08,backlight:true})
  const root=buildMirrorGeometry(node),box=new Box3().setFromObject(root)
  expect(box.max.x-box.min.x).toBeCloseTo(node.width,3)
  expect(box.max.y-box.min.y).toBeCloseTo(node.height,3)
  expect(root.getObjectByName('mirror-frame')!==undefined).toBe(frameEnabled)
  expect(root.getObjectByName('mirror-backing')).toBeDefined()
  expect(root.getObjectByName('mirror-backlight')).toBeDefined()
  root.traverse(object=>{if(object instanceof Mesh){
   const positions=object.geometry.getAttribute('position')
   for(const value of positions.array) expect(Number.isFinite(value)).toBe(true)
   object.geometry.dispose()
  }})
 }
})
