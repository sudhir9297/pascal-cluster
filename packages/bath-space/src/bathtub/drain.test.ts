import {expect,test} from 'bun:test'
import {Mesh,Raycaster,Vector3} from 'three'
import {BathtubNode,bathtubPresets} from './schema'
import {bathDrainFloor,bathDrainPosition,drainFitsFloor} from './drain'
import {buildBathtubGeometry,bathtubGeometryKey} from './geometry'
import {bathSection} from './section'
test('adjustable handed drains and covers stay inside the real floor, including corner arcs and walk-in seats',()=>{
 for(const preset of bathtubPresets)for(const small of [false,true])for(const end of ['left','center','right'] as const)for(const cross of [-.5,.5]){
  const n=BathtubNode.parse({...preset,length:small?1.2:2.2,width:small?.65:1.1,height:preset.shape==='walk-in'?.99:.58,drainEnd:end,drainDistance:1,drainCrossOffset:cross,drainCover:false}),pos=bathDrainPosition(n),root=buildBathtubGeometry(n)
  expect(drainFitsFloor(pos,bathDrainFloor(n))).toBe(true)
  root.updateMatrixWorld(true);const hits=new Raycaster(new Vector3(pos[0],2,pos[1]),new Vector3(0,-1,0)).intersectObject(root,true).filter(hit=>['bathtub-shell','bathtub-interior','walk-in-floor','walk-in-floor-interior'].includes(hit.object.name));expect(hits.map(h=>h.object.name),JSON.stringify({shape:n.shape,small,end,cross,pos})).toHaveLength(0)
  const covered=buildBathtubGeometry({...n,drainCover:true}),cover=covered.getObjectByName('bathtub-drain')!
  expect(cover.position.x).toBeCloseTo(pos[0],6);expect(cover.position.z).toBeCloseTo(pos[1],6)
  for(const group of [root,covered])group.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose()})
 }
},15000)
test('drain edits update plan drawings and cache keys, while mirrored presets preserve requested distances',()=>{
 const left=BathtubNode.parse({shape:'alcove',drainEnd:'left',drainDistance:.2,drainCrossOffset:.08}),right={...left,drainEnd:'right' as const}
 expect(bathDrainPosition(left)[0]).toBeCloseTo(-.2,6);expect(bathDrainPosition(right)[0]).toBeCloseTo(.2,6)
 expect(bathDrainPosition(left)[1]).toBeCloseTo(.08,6)
 expect(bathtubGeometryKey(left)).not.toBe(bathtubGeometryKey(right));expect(bathSection(left).drawing.planDetail).not.toBe(bathSection(right).drawing.planDetail)
 const saved=BathtubNode.parse(JSON.parse(JSON.stringify(left)));expect(saved.drainDistance).toBe(.2);expect(saved.drainCrossOffset).toBe(.08)
})
