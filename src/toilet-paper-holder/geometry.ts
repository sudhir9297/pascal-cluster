import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import { BoxGeometry, CylinderGeometry, Group, Mesh, Shape, Path, ExtrudeGeometry, TorusGeometry, SphereGeometry, LatheGeometry, Vector2, type BufferGeometry } from 'three'
import type { ToiletPaperHolderNode } from './schema'
export function buildHolderGeometry(n: ToiletPaperHolderNode, ctx?: GeometryContext) {
  const root = new Group()
  const add = (g: BufferGeometry, slot: string, x: number, y: number, z: number) => {
    const ref = n.slots?.[slot]
    const material = (ref ? resolveMaterialRef(ref, ctx?.materials, 'rendered') : null) ?? createDefaultMaterial(slot === 'paper' ? '#f4f1e9' : slot === 'core' ? '#ac9273' : '#bbc3cb', slot === 'metal' ? 0.2 : 0.85, 'rendered')
    const mesh = new Mesh(g, material)
    mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true
    mesh.userData = {slotId: slot, __fromGeometry: true}; root.add(mesh); return mesh
  }
  const rod = (radius: number, length: number, x: number, y: number, z: number, axis: 'x' | 'z') => {
    const m = add(new CylinderGeometry(radius,radius,length,32), 'metal',x,y,z)
    if(axis === 'x') m.rotation.z = Math.PI/2; else m.rotation.x = Math.PI/2
  }
  const left = -n.width/2 + 0.018, right = n.width/2 - 0.018
  for(const x of n.shape === 'open' ? [left] : [left,right]) {
    const plate = add(new LatheGeometry([new Vector2(0,0),new Vector2(0.022,0),new Vector2(0.025,0.002),new Vector2(0.025,0.006),new Vector2(0.022,0.009),new Vector2(0,0.009)],64), 'metal',x,0,0); plate.rotation.x = Math.PI/2
    const collar=add(new CylinderGeometry(0.013,0.013,0.016,40),'metal',x,0,0.018); collar.rotation.x=Math.PI/2
    rod(0.009,n.projection-0.009,x,0,(n.projection+0.009)/2,'z')
  }
  rod(0.008,n.width-0.036,0,0,n.projection,'x')
  for(const x of [left,right]) add(new SphereGeometry(0.009,24,16),'metal',x,0,n.projection)
  if(n.shape === 'open') {
    add(new CylinderGeometry(0.008,0.008,0.022,32),'metal',right,0.011,n.projection)
    add(new SphereGeometry(0.008,24,16),'metal',right,0.022,n.projection)
  } else {
    for(const x of [left,right]) {const collar=add(new CylinderGeometry(0.012,0.012,0.01,32),'metal',x,0,n.projection);collar.rotation.z=Math.PI/2}
  }
  if(n.showRoll) {
    const ring = (outer: number, inner: number, length: number, slot: string) => {
      const s = new Shape(); s.absarc(0,0,outer,0,Math.PI*2,false)
      const hole = new Path(); hole.absarc(0,0,inner,0,Math.PI*2,true); s.holes.push(hole)
      const g = new ExtrudeGeometry(s,{depth:length,bevelEnabled:false,curveSegments:64})
      g.rotateY(Math.PI/2); g.translate(-length/2,0,0)
      add(g,slot,0,0,n.projection)
    }
    ring(0.018,0.014,n.rollWidth,'core'); ring(n.rollRadius,0.018,n.rollWidth,'paper')
    for(const x of [-n.rollWidth/2,n.rollWidth/2]) {
      for(let i=1;i<=7;i++) {
        const radius=0.018+(n.rollRadius-0.018)*i/8
        const layer=add(new TorusGeometry(radius,0.00018,4,64),'paper',x,0,n.projection);layer.rotation.y=Math.PI/2
      }
    }
    if(n.paperLength > 0) {
      const profile=new Shape(); profile.moveTo(n.projection+n.rollRadius,0)
      for(let i=1;i<=20;i++) {const t=i/20;profile.lineTo(n.projection+n.rollRadius+0.004*t*t,-n.paperLength*t)}
      for(let i=20;i>=0;i--) {const t=i/20;profile.lineTo(n.projection+n.rollRadius+0.004*t*t-0.0007,-n.paperLength*t)}
      profile.closePath()
      const g=new ExtrudeGeometry(profile,{depth:n.rollWidth,bevelEnabled:false});g.rotateY(-Math.PI/2);g.translate(n.rollWidth/2,0,0)
      add(g,'paper',0,0,0)
    }
  }
  if(n.shape === 'covered') {
    const radius = n.rollRadius + 0.008
    const s = new Shape(); s.absarc(0,0,radius,0,Math.PI,false); s.absarc(0,0,radius-0.002,Math.PI,0,true); s.closePath()
    const g = new ExtrudeGeometry(s,{depth:n.width-0.025,bevelEnabled:false,curveSegments:48}); g.rotateY(Math.PI/2); g.translate(-(n.width-0.025)/2,0,0)
    add(g,'metal',0,0,n.projection)
    rod(0.008,n.width-0.025,0,0,n.projection-radius,'x')
    const lip=add(new BoxGeometry(n.width-0.025,0.004,0.003),'metal',0,0,n.projection+radius)
    lip.name='cover-front-lip'
  }
  return root
}
export const holderGeometryKey = (n: ToiletPaperHolderNode) => JSON.stringify([n.shape,n.width,n.projection,n.rollWidth,n.rollRadius,n.paperLength,n.showRoll,n.slots])
