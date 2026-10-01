import {bathWellFloor,bathBackrestAngleLimit,bathBackrestProgress} from './backrest'
import {bathDrainPosition,bathDrainDistanceLimit,bathDrainCrossLimits} from './drain'
import { walkInLayout } from './walk-in-geometry'
import {
  sectionDimension as dim,
  sectionDetail as detail,
  sectionEllipse as ellipse,
  sectionRect as rect,
  type SectionModel,
} from '../section/fields'
import { bathDrainX, bathBaseHeight, bathBaseStyle, bathBowlDepth, bathRimWidth, type BathtubNode } from './schema'
import { bathCornerOutline, bathtubOutline } from './geometry'

function backrestDimensions(node:BathtubNode){if(node.shape==='walk-in')return [detail('seatBackrestAngle','Seat backrest lean',node.seatBackrestAngle,0,12,1,'°')];if(node.backrestProfile==='classic')return [];const well=bathWellFloor(node),limit=bathBackrestAngleLimit(node);return [detail('backrestLeftAngle','Left backrest slope',well.leftAngle,10,limit,1,'°'),detail('backrestRightAngle','Right backrest slope',well.rightAngle,10,limit,1,'°')]}
function plumbingDimensions(node:BathtubNode){return node.showPlumbing?[detail('wasteRecessDepth','Waste recess depth',node.wasteRecessDepth,.1,.25,.005),detail('wasteOutletLength','Waste outlet length',node.wasteOutletLength,.08,.4,.005),{...detail('wasteOutletAngle','Waste outlet direction',node.wasteOutletAngle*180/Math.PI,-180,180,5,'°'),patch:(value:number)=>({wasteOutletAngle:value*Math.PI/180})}]:[]}
function drainDimensions(node:BathtubNode){
 const position=bathDrainPosition(node),cross=bathDrainCrossLimits(node),distance=bathDrainDistanceLimit(node)
 return [...(node.drainEnd!=='center'&&distance>0.001?[detail('drainDistance','Drain from centre',Math.abs(position[0]),0,distance,0.001)]:[]),...(cross.max-cross.min>0.001?[detail('drainCrossOffset','Drain across floor',position[1],cross.min,cross.max,0.001)]:[])]
}
export function bathSection(node: BathtubNode): SectionModel {
  if(node.shape==='walk-in') {
    const {length:l,width:w,height:h}=node,{wall:t,threshold,seatDepth,seatHeight,sign,doorX,doorWidth}=walkInLayout(node)
    const drain=bathDrainPosition(node)
    const seatStart=sign>0?l-t-seatDepth:t
    // Match the seat back's rotated box in the walk-in geometry.
    const backHeight = h - seatHeight - 0.025
    const backAngle = sign * node.seatBackrestAngle * Math.PI / 180
    const backX = l / 2 + sign * (l / 2 - t * 1.8 - Math.sin(Math.abs(backAngle)) * backHeight / 2)
    const backY = seatHeight + Math.cos(backAngle) * backHeight / 2
    const backPoints = ([
      [-t * 0.6, -backHeight / 2],
      [t * 0.6, -backHeight / 2],
      [t * 0.6, backHeight / 2],
      [-t * 0.6, backHeight / 2],
    ] as const).map(([x, y]) => [
      backX + x * Math.cos(backAngle) - y * Math.sin(backAngle),
      h - (backY + x * Math.sin(backAngle) + y * Math.cos(backAngle)),
    ])
    const back = `M${backPoints.map(point => point.join(',')).join('L')}Z`
    const hinge=doorX-sign*doorWidth/2+l/2,angle=node.doorOpening*Math.PI/2
    const door=`M${hinge},${t/2}L${hinge+sign*doorWidth*Math.cos(angle)},${t/2+doorWidth*Math.sin(angle)}`
    return {drawing:{width:l,depth:w,height:h,plan:rect(0,0,l,w),planDetail:rect(t,t,l-t*2,w-t*2)+rect(seatStart,t,seatDepth,w-t*2)+door+ellipse(.052,.052,l/2+drain[0]-.026,w/2+drain[1]-.026),section:rect(0,0,t,h)+rect(l-t,0,t,h)+rect(t,h-threshold,l-t*2,threshold)+rect(seatStart,h-seatHeight,seatDepth,seatHeight-threshold)+back,floor:true},dimensions:[
      dim('length','Length',l,1.2,2.2,0.005,'plan','x'),dim('width','Width',w,0.65,1.1,0.005,'plan','y'),dim('height','Rim height',h,0.85,1.15,0.005),
      ...drainDimensions(node),...plumbingDimensions(node),...backrestDimensions(node),detail('rimWidth','Wall and rim width',node.rimWidth,0.035,0.12,0.001),detail('thresholdHeight','Entry threshold',threshold,0.04,0.15,0.005),detail('seatHeight','Seat height',seatHeight,0.3,Math.min(0.55,h-0.15),0.005),detail('seatDepth','Seat depth',seatDepth,0.3,0.55,0.005),detail('doorWidth','Door width',doorWidth,0.38,Math.min(0.65,w-t*2-0.025,l*0.45),0.005)
    ]}
  }
  const { length: l, width: w, height: h } = node,
    r = bathRimWidth(node),
    bowlDepth = bathBowlDepth(node)
  const baseHeight = bathBaseHeight(node)
  const raised = node.shape === 'slipper' ? 0.14 : 0
  const plan = `M${bathtubOutline(node)
    .map(([x, z]) => `${x + l / 2},${z + w / 2}`)
    .join('L')}Z`
  const inner =
    node.shape === 'corner'
      ? `M${bathCornerOutline(l - r * 2, w - r * 2).map(([x,z]) => `${x + l / 2},${z + w / 2}`).join('L')}Z`
      : node.shape === 'rectangle' || node.shape === 'alcove' || (node.shape === 'undermount' && node.builtInShape === 'rectangle')
      ? rect(r, r, l - r * 2, w - r * 2)
      : ellipse(l - r * 2, w - r * 2, r, r)
  let section = `M${l * 0.1},${h + raised - baseHeight}Q0,${h * 0.6} 0,0H${r}Q${l * 0.15},${bowlDepth} ${l * 0.225},${bowlDepth}H${l * 0.775}Q${l * 0.85},${bowlDepth} ${l - r},${raised}H${l}Q${l},${h * 0.6} ${l * 0.9},${h + raised - baseHeight}Z`

  if(node.backrestProfile!=='classic'){const well=bathWellFloor(node),left=(l-well.length)/2+well.center,right=left+well.length,roll=.012*(h-baseHeight)/h,wall=Array.from({length:25},(_,i)=>{const u=i/24,progress=bathBackrestProgress(node,u);return {left:left+(r-left)*progress,right:right+(l-r-right)*progress,y:raised+roll+(bowlDepth-roll)*(1-(1-u)**2)}});section=`M${r},${raised}L${wall.map(p=>`${p.left},${p.y}`).join('L')}L${[...wall].reverse().map(p=>`${p.right},${p.y}`).join('L')}L${l-r},${raised}H${l}Q${l},${h*.6} ${l*.975},${h+raised-baseHeight}H${l*.025}Q0,${h*.6} 0,${raised}Z`}

  const drain=bathDrainPosition(node)
  const dimensions = [
    dim('length', 'Length', l, 1.2, 2.2, 0.005, 'plan', 'x'),
    dim('width', 'Width', w, 0.65, node.shape === 'corner' ? 1.8 : 1.1, 0.005, 'plan', 'y'),
    { ...dim('height', 'Rim height', h, 0.45, 0.75, 0.005), start: raised },
    detail(
      'bowlDepth',
      'Bowl depth',
      bowlDepth,
      Math.min(0.3, bowlDepth),
      Math.min(0.55, h - baseHeight - 0.07),
      0.005,
    ),
    detail(
      'rimWidth',
      'Rim width',
      r,
      node.tapMount === 'rim' ? 0.09 : 0.035,
      0.12,
      0.001,
    ),
  ]
  dimensions.push(...drainDimensions(node),...plumbingDimensions(node),...backrestDimensions(node))
  if (node.shape === 'alcove') dimensions.push(detail('apronThickness', 'Apron thickness', node.apronThickness, 0.015, 0.05, 0.001))
  if (baseHeight > 0) dimensions.push(detail('baseHeight', 'Support height', baseHeight, 0.08, 0.2, 0.005))
  return {
    drawing: {
      width: l,
      depth: w,
      height: h + raised,
      plan,
      planDetail: inner+ellipse(.052,.052,l/2+drain[0]-.026,w/2+drain[1]-.026) + (node.shape === 'alcove' ? rect(0.0125, 0, l - 0.025, node.apronThickness) : ''),
      section: section + (baseHeight > 0 ? (bathBaseStyle(node) === 'pedestal' ? rect(l * 0.1, h + raised - baseHeight, l * 0.8, baseHeight) : rect(l * 0.18, h + raised - baseHeight, 0.08, baseHeight) + rect(l * 0.77, h + raised - baseHeight, 0.08, baseHeight)) : ''),
      detail: node.drainCover
        ? rect(l / 2 + bathDrainX(node) - 0.03, raised + bowlDepth - 0.006, 0.06, 0.006)
        : undefined,
      floor: true,
    },
    dimensions,
  }
}
