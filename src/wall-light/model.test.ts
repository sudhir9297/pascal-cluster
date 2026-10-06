import {expect,test} from 'bun:test'
import {Box3,Mesh,MeshStandardMaterial} from 'three'
import {WallNode} from '@pascal-app/core'
import {WallLightNode} from './schema'
import {buildWallLightGeometry} from './geometry'
import {wallLightPlacement} from './placement'
test('bar light has finite authored dimensions, independently paintable housing and controllable emission',()=>{
 for(const enabled of [true,false]){
  const n=WallLightNode.parse({enabled}),root=buildWallLightGeometry(n),bounds=new Box3().setFromObject(root)
  expect(bounds.max.x-bounds.min.x).toBeCloseTo(n.width)
  expect(bounds.max.y-bounds.min.y).toBeCloseTo(n.height)
  expect(bounds.max.z).toBeCloseTo(n.depth+0.004)
  const housing=root.children[0] as Mesh,diffuser=root.children[1] as Mesh
  expect(housing.userData.slotId).toBe('housing')
  expect(diffuser.userData.slotId).toBeUndefined()
  expect((diffuser.material as MeshStandardMaterial).emissiveIntensity).toBe(enabled?1.2:0)
 }
})
test('light mounting rejects short and low walls and honours opposite face',()=>{
 const n=WallLightNode.parse({}),wall=WallNode.parse({start:[0,0],end:[3,0],height:2.5,thickness:0.2})
 expect(wallLightPlacement(n,wall,1,'back')?.position).toEqual([1,2,-0.1])
 expect(wallLightPlacement(n,{...wall,height:1.8},1,'front')).toBeNull()
 expect(wallLightPlacement(n,{...wall,end:[0.1,0]},1,'front')).toBeNull()
})
