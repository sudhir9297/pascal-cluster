import {bathBowlDepth,bathRimWidth,bathBaseHeight,type BathtubNode} from './schema'
export const bathBackrestPresets=[
 {id:'classic',label:'Original curved',angle:30},
 {id:'curved',label:'Adjustable curved',angle:30},
 {id:'straight',label:'Straight backrests',angle:30},
 {id:'reclined',label:'Reclined backrests',angle:45},
 {id:'upright',label:'Upright backrests',angle:15},
] as const
export const bathBackrestDepth=(node:BathtubNode)=>bathBowlDepth(node)-.012*(node.height-bathBaseHeight(node))/node.height
export function bathBackrestAngleLimit(node:BathtubNode){return Math.min(55,Math.atan((node.length-bathRimWidth(node)*2)*.32/bathBackrestDepth(node))*180/Math.PI)}
export function bathWellFloor(node:BathtubNode){
 if(node.backrestProfile==='classic')return {length:node.length*.55,width:node.width*.48,center:0,leftAngle:0,rightAngle:0}
 const inner=node.length-bathRimWidth(node)*2,depth=bathBackrestDepth(node),limit=bathBackrestAngleLimit(node),leftAngle=Math.min(limit,node.backrestLeftAngle),rightAngle=Math.min(limit,node.backrestRightAngle),left=depth*Math.tan(leftAngle*Math.PI/180),right=depth*Math.tan(rightAngle*Math.PI/180)
 return {length:inner-left-right,width:node.width*.48,center:(left-right)/2,leftAngle,rightAngle}
}
export function bathBackrestProgress(node:BathtubNode,u:number){return node.backrestProfile==='classic'||node.backrestProfile==='curved'?Math.cos(u*Math.PI/2):(1-u)**2}
