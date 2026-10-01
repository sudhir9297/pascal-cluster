import {bathWellFloor} from './backrest'
import {type BathtubNode} from './schema'
import {basinOutline} from '../countertop-basin/geometry'
import {bathCornerOutline} from './corner-outline'
type Point=[number,number]
const margin=0.032
export function bathDrainFloor(node:BathtubNode):Point[]{
 if(node.shape==='walk-in'){
  const t=node.rimWidth,seat=Math.min(node.seatDepth,node.length-Math.min(node.doorWidth,node.width-t*2-.025,node.length*.45)-.18),left=node.doorSide==='left'?-node.length/2+t:-node.length/2+t+seat,right=node.doorSide==='left'?node.length/2-t-seat:node.length/2-t
  return [[left,-node.width/2+t],[right,-node.width/2+t],[right,node.width/2-t],[left,node.width/2-t]]
 }
 const {length:l,width:w,center}=bathWellFloor(node)
 return (node.shape==='corner'?bathCornerOutline(l,w):basinOutline(node.shape==='undermount'?node.builtInShape:node.shape==='rectangle'||node.shape==='alcove'?'rectangle':'oval',l,w)).map(([x,z])=>[x+center,z] as Point)
}
export function drainFitsFloor(point:Point,floor:Point[],clearance=margin){
 let inside=false,min=Infinity
 for(let i=0,j=floor.length-1;i<floor.length;j=i++){
  const a=floor[j]!,b=floor[i]!,dx=b[0]-a[0],dz=b[1]-a[1],length2=dx*dx+dz*dz,u=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/length2))
  min=Math.min(min,Math.hypot(point[0]-a[0]-u*dx,point[1]-a[1]-u*dz))
  if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside
 }
 return inside&&min>=clearance-1e-9
}
function travel(origin:Point,axis:0|1,sign:number,floor:Point[]){let low=0,high=3;for(let i=0;i<36;i++){const mid=(low+high)/2,p=[...origin] as Point;p[axis]+=sign*mid;if(drainFitsFloor(p,floor))low=mid;else high=mid}return origin[axis]+sign*low}
export function bathDrainBounds(node:BathtubNode){
 const floor=bathDrainFloor(node),origin:Point=node.shape==='walk-in'?[(floor[0]![0]+floor[1]![0])/2,0]:[bathWellFloor(node).center,0]
 return {floor,origin,minX:travel(origin,0,-1,floor),maxX:travel(origin,0,1,floor)}
}
export function bathDrainDistanceLimit(node:BathtubNode){const b=bathDrainBounds(node);return node.drainEnd==='left'?Math.max(0,-b.minX):node.drainEnd==='right'?Math.max(0,b.maxX):0}
export function bathDrainPosition(node:BathtubNode):Point{
 const b=bathDrainBounds(node),requested=node.drainEnd==='center'?b.origin[0]:(node.drainEnd==='left'?-1:1)*(node.drainDistance??node.length*(node.shape==='corner'?.1:.23)),x=Math.max(b.minX,Math.min(b.maxX,requested)),origin:Point=[x,0]
 const low=travel(origin,1,-1,b.floor),high=travel(origin,1,1,b.floor)
 return [x,Math.max(low,Math.min(high,node.drainCrossOffset))]
}
export const bathDrainX=(node:BathtubNode)=>bathDrainPosition(node)[0]
export function bathDrainCrossLimits(node:BathtubNode){const x=bathDrainX(node),floor=bathDrainFloor(node);return {min:travel([x,0],1,-1,floor),max:travel([x,0],1,1,floor)}}
