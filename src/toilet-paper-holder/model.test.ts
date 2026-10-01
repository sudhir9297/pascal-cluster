import {expect,test} from 'bun:test'
import {WallNode} from '@pascal-app/core'
import {Box3} from 'three'
import {ToiletPaperHolderNode,holderPresets} from './schema'
import {buildHolderGeometry} from './geometry'
import {holderPlacement} from './placement'
import {holderSection} from './section'
test('holder styles have finite geometry and stay clear of the wall',()=>{
  for(const preset of holderPresets) {
    const n=ToiletPaperHolderNode.parse(preset), root=buildHolderGeometry(n), bounds=new Box3().setFromObject(root)
    expect(bounds.min.z).toBeGreaterThanOrEqual(-0.00001)
    expect(bounds.max.z).toBeCloseTo(n.projection+n.rollRadius+(n.shape==='covered'?0.0095:0.004),3)
    expect(Number.isFinite(bounds.min.x)).toBe(true)
    expect(holderSection(n).drawing.section).not.toContain('NaN')
  }
})
test('holder follows the chosen wall face and cursor height',()=>{
  const wall=WallNode.parse({start:[0,0],end:[3,0],thickness:0.2}), n=ToiletPaperHolderNode.parse({mountingHeight:1.23})
  expect(holderPlacement(n,wall,1,'front')?.position).toEqual([1,1.23,0.1])
  expect(holderPlacement(n,wall,1,'back')?.position).toEqual([1,1.23,-0.1])
  expect(holderPlacement(n,wall,1,'back')?.rotation).toBe(Math.PI)
})
