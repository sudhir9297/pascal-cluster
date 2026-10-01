import {BufferGeometry,Float32BufferAttribute,Group,Mesh,Vector3,Raycaster,CylinderGeometry,CatmullRomCurve3,LineCurve3} from 'three'
import {createDefaultMaterial,resolveMaterialRef} from '@pascal-app/viewer'
import type {GeometryContext} from '@pascal-app/core'
import {type BathtubNode,bathBowlDepth,bathBaseHeight} from './schema'
import {bathDrainPosition} from './drain'

type Vertex={id?:number,p:Vector3,n:Vector3,uv:[number,number]}
type Plane={n:Vector3,d:number}
/** Remove a convex bore while retaining interpolated UVs and normals at each cut edge. */
export function cutBathBore(g:BufferGeometry,center:Vector3,axis:Vector3,radius:number,length:number){
 const u=new Vector3(0,1,0).cross(axis).normalize(),v=axis.clone().cross(u).normalize(),planes:Plane[]=[]
 for(let i=0;i<32;i++){const a=i*Math.PI*2/32,n=u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v,Math.sin(a));planes.push({n,d:n.dot(center)+radius*Math.cos(Math.PI/32)})}
 planes.push({n:axis,d:axis.dot(center)+length/2},{n:axis.clone().negate(),d:-axis.dot(center)+length/2})
 const p=g.getAttribute('position'),norm=g.getAttribute('normal'),uv=g.getAttribute('uv'),outP:number[]=Array.from(p.array),outN:number[]=Array.from(norm.array),outUV:number[]=Array.from(uv.array),indices:number[]=[]
 const split=(polygon:Vertex[],plane:Plane,inside:boolean)=>{const result:Vertex[]=[];for(let i=0;i<polygon.length;i++){const a=polygon[i]!,b=polygon[(i+1)%polygon.length]!,da=plane.n.dot(a.p)-plane.d,db=plane.n.dot(b.p)-plane.d,keep=inside?da<=1e-9:da>=-1e-9;if(keep)result.push(a);if((da<0&&db>0)||(da>0&&db<0)){const t=da/(da-db);result.push({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),uv:[a.uv[0]+(b.uv[0]-a.uv[0])*t,a.uv[1]+(b.uv[1]-a.uv[1])*t]})}}return result}
 const emit=(polygon:Vertex[])=>{for(let j=1;j+1<polygon.length;j++)for(const a of [polygon[0]!,polygon[j]!,polygon[j+1]!]){if(a.id===undefined){a.id=outP.length/3;outP.push(...a.p.toArray());outN.push(...a.n.toArray());outUV.push(...a.uv)}indices.push(a.id)}}
 const count=g.index?.count??p.count
 for(let i=0;i<count;i+=3){const ids=[0,1,2].map(offset=>g.index?g.index.getX(i+offset):i+offset);
  if(([1,0,2] as const).some(a=>{const extent=Math.abs(axis.getComponent(a))*length/2+radius,c=center.getComponent(a);return ids.every(id=>p.getComponent(id,a)<c-extent)||ids.every(id=>p.getComponent(id,a)>c+extent)})){indices.push(...ids);continue}
  let remaining:Vertex[]=ids.map(id=>{return {id,p:new Vector3().fromBufferAttribute(p,id),n:new Vector3().fromBufferAttribute(norm,id),uv:[uv.getX(id),uv.getY(id)] as [number,number]}})
  // Most triangles miss the small bore; retain their original attributes directly.
  if(planes.some(plane=>remaining.every(a=>plane.n.dot(a.p)>plane.d+1e-9))){emit(remaining);continue}
  for(const plane of planes){emit(split(remaining,plane,false));remaining=split(remaining,plane,true);if(remaining.length<3)break}
 }
 const result=new BufferGeometry();result.setAttribute('position',new Float32BufferAttribute(outP,3));result.setAttribute('normal',new Float32BufferAttribute(outN,3));result.setAttribute('uv',new Float32BufferAttribute(outUV,2));result.setIndex(indices);g.dispose();return result
}
/** Hollow tube including annular end faces, so the pipe never has a solid outlet cap. */
export function bathPipe(points:Vector3[],radius:number,thickness=.002){
 const curve=points.length===2?new LineCurve3(points[0]!,points[1]!):new CatmullRomCurve3(points,false,'centripetal'),segments=points.length===2?1:48,sides=32,frames=curve.computeFrenetFrames(segments,false),p:number[]=[],uv:number[]=[],index:number[]=[]
 for(const r of [radius,radius-thickness])for(let i=0;i<=segments;i++){const c=curve.getPointAt(i/segments);for(let j=0;j<=sides;j++){const a=j*Math.PI*2/sides,q=c.clone().addScaledVector(frames.normals[i]!,r*Math.cos(a)).addScaledVector(frames.binormals[i]!,r*Math.sin(a));p.push(...q.toArray());uv.push(j/sides*Math.PI*2*r,i/segments*curve.getLength())}}
 const stride=sides+1,offset=(segments+1)*stride
 for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*stride+j,b=a+stride;index.push(a,b,a+1,a+1,b,b+1);index.push(offset+a,offset+a+1,offset+b,offset+a+1,offset+b+1,offset+b)}
 for(const row of [0,segments*stride])for(let j=0;j<sides;j++){const a=row+j;index.push(a,a+1,offset+a,a+1,offset+a+1,offset+a)}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g
}
export function addBathPlumbing(group:Group,node:BathtubNode,ctx?:GeometryContext){
 const material=(slot:string)=>(node.slots?.[slot]?resolveMaterialRef(node.slots[slot]!,ctx?.materials,'rendered'):null)??createDefaultMaterial(slot==='plumbing'?'#dadada':'#c0c0c0',.3,'rendered')
 const add=(name:string,g:BufferGeometry,slot:string)=>{const m=new Mesh(g,material(slot));m.name=name;m.userData={slotId:slot,__fromGeometry:true};m.castShadow=m.receiveShadow=true;group.add(m);return m}
 const drain=bathDrainPosition(node),base=bathBaseHeight(node),floor=node.shape==='walk-in'?Math.min(node.thresholdHeight,node.height-.2):node.height-bathBowlDepth(node)-.006*(node.height-base)/node.height
 const floorRise=node.shape==='slipper'?.14*(Math.min(0,drain[0])/(node.length/2))**2*((floor-base)/(node.height-base))**2*(node.height-base)/node.height:0
 const wasteTop=new Vector3(drain[0],floor+floorRise,drain[1]),teeY=-node.wasteRecessDepth+.075,tee=new Vector3(drain[0],teeY,drain[1])
 let overflowBack:Vector3|undefined
 if(node.overflow){
  group.updateMatrixWorld(true)
  const direction=node.shape==='walk-in'||node.drainEnd==='center'?new Vector3(0,0,1):new Vector3(node.drainEnd==='left'?-1:1,0,0)
  const interior:Mesh[]=[];group.traverse(o=>{if(o instanceof Mesh&&o.userData.slotId==='interior')interior.push(o)})
  const hit=new Raycaster(new Vector3(0,node.height-.07,0),direction).intersectObjects(interior,false)[0]
  if(hit){
   const inlet=hit.point,axis=direction,outerSurfaces:Mesh[]=[];group.traverse(o=>{if(o instanceof Mesh&&o.userData.slotId==='shell')outerSurfaces.push(o)})
   const outside=new Raycaster(inlet.clone().addScaledVector(axis,1),axis.clone().negate()).intersectObjects(outerSurfaces,false)[0]
   const wallDepth=outside?Math.max(.02,outside.point.clone().sub(inlet).dot(axis)):.08
   const end=inlet.clone().addScaledVector(axis,wallDepth-.002),center=inlet.clone().lerp(end,.5),length=wallDepth+.09
   for(const mesh of [...interior,...outerSurfaces]){mesh.geometry=cutBathBore(mesh.geometry,mesh.worldToLocal(center.clone()),axis.clone().transformDirection(mesh.matrixWorld.clone().invert()),.018,length)}
   const trim=add('bathtub-overflow',bathPipe([inlet.clone().addScaledVector(axis,-.008),inlet.clone().addScaledVector(axis,.002)],.027,.009),'overflow')
   trim.userData.inlet=inlet.toArray()
   add('bathtub-overflow-channel',bathPipe([inlet.clone(),end],.018),'overflow')
   overflowBack=end.clone().addScaledVector(axis,.018)
   if(node.showPlumbing)add('bathtub-overflow-coupling',bathPipe([end,overflowBack],.018),'plumbing')
  }
 }
 if(!node.showPlumbing)return
 add('bathtub-waste-tailpiece',bathPipe([wasteTop,tee],.025),'plumbing')
 const direction=new Vector3(Math.sin(node.wasteOutletAngle),0,Math.cos(node.wasteOutletAngle)),bottom=tee.clone().addScaledVector(direction,.06);bottom.y=-node.wasteRecessDepth+.023
 const rise=tee.clone().addScaledVector(direction,.14),outlet=rise.clone().addScaledVector(direction,node.wasteOutletLength)
 add('bathtub-waste-trap',bathPipe([tee,bottom,rise,outlet],.021),'plumbing')
 const target=new Group();target.name='bath-waste-outlet';target.position.copy(outlet);target.rotation.y=node.wasteOutletAngle;target.userData={plumbingConnection:true,hostId:node.id,diameter:.042,direction:direction.toArray()};group.add(target)
 if(overflowBack){const drop=overflowBack.clone();drop.y=teeY+.07;const join=tee.clone();join.y+=.045;add('bathtub-overflow-hose',bathPipe([overflowBack,overflowBack.clone().add(new Vector3(0,-.045,0)),drop,join],.0125),'plumbing')}
 const collar=add('bathtub-waste-coupling',new CylinderGeometry(.03,.03,.018,32,1,true),'plumbing');collar.position.copy(wasteTop);collar.position.y-=.025
}
