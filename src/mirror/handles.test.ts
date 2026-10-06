import {expect,test} from 'bun:test'
import {LevelNode,WallNode} from '@pascal-app/core'
import {MirrorNode} from './schema'
import {mirrorEdit,mirrorHandles} from './handles'
import {mirrorSection} from './section'
import {mirrorGeometryKey} from './geometry'
test('mirror arrows preserve attachment and reject sizes outside the supporting wall',()=>{
 const level=LevelNode.parse({height:2.5}),wall=WallNode.parse({parentId:level.id,start:[0,0],end:[2,0]})
 const node=MirrorNode.parse({wallId:wall.id,parentId:wall.id,position:[1,1.5,.05],slots:{frame:'paint'}})
 const scene={nodes:()=>({[wall.id]:wall,[level.id]:level})}
 const patch=mirrorEdit(node,{width:1.2},scene)
 expect(patch.parentId).toBe(wall.id)
 expect(patch.position).toEqual([1,1.5,.05])
 expect(MirrorNode.parse({...node,...patch}).slots).toEqual(node.slots)
 expect(mirrorEdit(node,{width:2.4},scene)).toEqual({})
 expect(mirrorEdit(node,{mountingHeight:2.3},scene)).toEqual({})
 expect(mirrorEdit(node,{mountingHeight:1.6},scene).position).toEqual([1,1.6,.05])
 const round=MirrorNode.parse({...node,shape:'round'})
 expect(mirrorHandles(round).some(handle=>handle.currentValue?.(round)===round.height&&handle.axis==='y')).toBe(false)
 expect(mirrorEdit(round,{width:1.2},scene).height).toBe(1.2)
 expect(mirrorHandles(node).length).toBe(5)
 expect(mirrorHandles({...node,frameEnabled:false}).length).toBe(4)
})
test('mirror section and geometry invalidate for construction and surface controls',()=>{
 const node=MirrorNode.parse({})
 for(const patch of [{frameEnabled:false},{frameProfile:'rounded'},{glassThickness:.006},{wallGap:.02},{bevelEnabled:false},{surface:'bronze'},{backlight:true},{temperature:'cool'},{brightness:80}]){
  const next=MirrorNode.parse({...node,...patch})
  expect(mirrorGeometryKey(next)).not.toBe(mirrorGeometryKey(node))
 }
 const model=mirrorSection(node)
 expect(model.drawing.section).not.toMatch(/NaN|Infinity/)
 expect(model.dimensions.map(field=>field.key)).toContain('mountingHeight')
 expect(model.dimensions.map(field=>field.key)).toContain('height')
})
