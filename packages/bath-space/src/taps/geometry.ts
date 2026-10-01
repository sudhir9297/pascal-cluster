import { BufferGeometry, CatmullRomCurve3, CylinderGeometry, Float32BufferAttribute, Group, LatheGeometry, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, RingGeometry, TubeGeometry, Vector2, Vector3 } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import { getTapPreset, tapMountingLayout } from './presets'
import { TapDetails } from './details'
import type { TapNode } from './schema'

export function tapDimensions(node: TapNode) {
  const preset = getTapPreset(node.presetId)
  const vintage = preset.design === 'vintage' || preset.design === 'vintage-arc'
  const topHandle = vintage || ['lever', 'waterfall', 'sculpted', 'mixer', 'plate'].includes(preset.design)
  const radius = node.bodyRadius ?? preset.bodyRadius
  const defaults = TapDetails.parse(node)
  return { ...preset, ...defaults, mountingLayout: tapMountingLayout(node), height: node.height ?? preset.height, reach: node.reach ?? preset.reach,
    bodyRadius: radius,
    handleStyle: defaults.handleStyle === 'auto' ? vintage ? 'cross' : preset.design === 'twin' ? 'wheel' : preset.design === 'plate' || preset.design === 'swan' || preset.id === 'tap-006' || preset.design === 'square-arc' ? 'pin' : 'lever' : defaults.handleStyle,
    handleLength: node.handleLength ?? (vintage ? .075 : topHandle ? .075 : .055),
    handleThickness: node.handleThickness ?? .008,
    spoutDiameter: node.spoutDiameter ?? Math.min(.05,radius * (preset.design === 'sculpted' ? 1.44 : 1)),
    baseWidth: Math.max(radius*2.1, node.baseWidth ?? radius*2.64),
    baseHeight: defaults.baseStyle === 'none' ? 0 : defaults.baseHeight,
    sprayHeadLength: Math.min(defaults.sprayHeadLength,Math.max(.035,(node.height ?? preset.height)*(1-defaults.outletDrop)-.01)),
    baseStyle: defaults.baseStyle === 'auto' ? ['lever','waterfall'].includes(preset.design) ? 'square' : 'round' : defaults.baseStyle,
    springRadius: node.springRadius ?? Math.max(.012,radius*.75) }

}
export function tapGeometryKey(node: TapNode) {
  return JSON.stringify([tapDimensions(node), node.handleAngle, node.slots])
}

// A square section swept around the same smooth bend as the round spouts.
function squareTube(curve: CatmullRomCurve3, radius: number) {
  const count = 64, frames = curve.computeFrenetFrames(count, false)
  const vertices: number[] = [], indices: number[] = []
  const corners = [[-1,-1], [1,-1], [1,1], [-1,1]] as const
  // Each face owns its edge vertices, preserving the square cross section.
  for (let side = 0; side < 4; side++) {
    const offset = vertices.length / 3
    for (let i = 0; i <= count; i++) {
      const center = curve.getPointAt(i / count)
      for (const corner of [corners[side]!, corners[(side+1)%4]!]) {
        const point = center.clone().addScaledVector(frames.normals[i]!, corner[0]*radius)
          .addScaledVector(frames.binormals[i]!, corner[1]*radius)
        vertices.push(point.x, point.y, point.z)
      }
      if (i < count) {
        const a = offset + i*2
        indices.push(a,a+1,a+3,a,a+3,a+2)
      }
    }
  }
  const geo = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(vertices, 3)).setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function buildSingleTapGeometry(node: TapNode): Group {
  const p = tapDimensions(node), h = p.height, reach = p.reach, r = p.bodyRadius
  const group = new Group()
  const finish = new MeshStandardMaterial({ color: '#ffffff', metalness: 0, roughness: 0.22 })
  const trim = new MeshStandardMaterial({ color: '#ffffff', metalness: 0, roughness: 0.22 })
  const dark = trim, red = trim, blue = trim
  function add(name: string, geometry: BufferGeometry, position: [number,number,number], material = finish) {
    const mesh = new Mesh(geometry, material)
    mesh.name = name; mesh.position.set(...position)
    mesh.castShadow = mesh.receiveShadow = true
    mesh.userData.__fromGeometry = true; mesh.userData.slotId = material === finish ? 'body' : 'trim'
    group.add(mesh)
    return mesh
  }
  function cylinder(name: string, radius: number, length: number, pos: [number,number,number], top = radius, material = finish) {
    return add(name, new CylinderGeometry(top, radius, length, 40), pos, material)
  }
  function box(name: string, size: [number,number,number], pos: [number,number,number], material = finish) {
    return add(name, new RoundedBoxGeometry(...size, 3, Math.min(...size) * .16), pos, material)
  }
  function pipe(name: string, points: [number,number,number][], radius: number, square = false, material = finish) {
    const curve = new CatmullRomCurve3(points.map(point => new Vector3(...point)), false, 'centripetal')
    add(name, square ? squareTube(curve, radius) : new TubeGeometry(curve, Math.max(80, points.length * 2), radius, 16, false), [0,0,0], material)
    return curve
  }
  function control(name: string, origin: [number,number,number], orientation: 'top' | 'left' | 'right' | 'front' = 'top', scale = 1) {
    const assembly = new Group(); assembly.name = name; assembly.position.set(...origin)
    if (orientation === 'right' || orientation === 'left') assembly.rotation.z = orientation === 'right' ? -Math.PI/2 : Math.PI/2
    if (orientation === 'front') assembly.rotation.x = -Math.PI/2
    group.add(assembly)
    const part = (label: string, geometry: BufferGeometry, position: [number,number,number], material = trim, parent = assembly) => {
      const mesh = add(label, geometry, position, material); parent.add(mesh); mesh.userData.slotId = 'handle'; return mesh
    }
    const hub = Math.min(r*.65,.019)*scale, length = p.handleLength*scale, thickness = p.handleThickness*scale
    part('cartridge-housing', new CylinderGeometry(hub*.85,hub,.012,32), [0,.006,0])
    const seam = part('cartridge-seal',new TorusGeometry(hub*.87,.001,8,32),[0,.012,0],dark); seam.rotation.x=Math.PI/2
    part('handle-hub',new CylinderGeometry(hub*.86,hub*.86,.01,32),[0,.017,0])
    const moving = new Group();moving.name='handle-pivot';moving.position.y=.021;assembly.add(moving)
    if (p.handleStyle === 'cross' || p.handleStyle === 'wheel') moving.rotation.y=node.handleAngle ?? 0
    else if(orientation==='left' || orientation==='right') moving.rotation.y=(orientation==='right' ? Math.PI/2 : -Math.PI/2)+(node.handleAngle ?? 0)
    else moving.rotation.x=orientation==='front' ? Math.abs(node.handleAngle ?? 0) : node.handleAngle ?? 0
    if (p.handleStyle === 'lever') {
      part('lever-handle',new RoundedBoxGeometry(hub*1.5,thickness,length,4,Math.min(thickness*.35,.003)),[0,thickness/2,-length*.38],(orientation==='right'||orientation==='left') && p.id==='tap-014'?dark:trim,moving)
      part('lever-grip',new RoundedBoxGeometry(hub*1.3,thickness*.35,length*.24,3,thickness*.1),[0,thickness*.75,-length*.72],trim,moving)
    } else if (p.handleStyle === 'pin') {
      const stem = part('pin-handle',new CylinderGeometry(thickness*.5,thickness*.5,length,24),[0,0,-length*.4],trim,moving);stem.rotation.x=Math.PI/2
      part('pin-grip-tip',new SphereGeometry(thickness*.58,16,12),[0,0,-length*.9],trim,moving)
    } else {
      const crossRadius = length*(p.handleStyle === 'wheel' ? .34 : .44)
      for (const angle of [0,Math.PI/2]) {
        const beam=part('cross-handle-arm',new CylinderGeometry(thickness*.45,thickness*.45,crossRadius*2,20),[0,0,0],trim,moving)
        beam.rotation.z=Math.PI/2;beam.rotation.y=angle
        if (p.handleStyle==='cross') for (const sign of [-1,1]) part('cross-grip',new SphereGeometry(thickness*.8,20,12),[Math.cos(angle)*crossRadius*sign,0,Math.sin(angle)*crossRadius*sign],trim,moving)
      }
      if (p.handleStyle==='wheel') {const wheel=part('wheel-handle',new TorusGeometry(crossRadius,thickness*.6,12,48),[0,0,0],trim,moving);wheel.rotation.x=Math.PI/2}
      part('porcelain-index-cap',new CylinderGeometry(hub*.6,hub*.6,.004,32),[0,.007,0],trim,moving)
    }
    if (p.temperatureMarkers) {
      const markerY=p.handleStyle==='lever' ? thickness+.001 : p.handleStyle==='pin' ? thickness*.55 : .01
      if(name==='hot-cold-knob') part('temperature-marker',new CylinderGeometry(.0024,.0024,.001,16),[0,markerY,-length*.1],orientation==='left'?blue:red,moving)
      else for(const sign of [-1,1]) part('temperature-marker',new CylinderGeometry(.0018,.0018,.001,12),[sign*.003,markerY,-length*.1],sign<0?blue:red,moving)
    }
    return assembly
  }
  function lever(y: number, z = 0) { return control('top-control',[0,y,z]) }
  function outlet(pos: [number,number,number], radius: number, square = false) {
    const assembly = new Group();assembly.name='outlet-assembly';assembly.position.set(...pos);assembly.rotation.x=Math.PI;group.add(assembly)
    if (!p.aeratorEnabled) return assembly
    const addOutlet = (name: string, geometry: BufferGeometry, position: [number,number,number], material: MeshStandardMaterial) => {
      const mesh = add(name,geometry,position,material);assembly.add(mesh);return mesh
    }
    if (square) {
      const width=radius*1.7, depth=Math.min(.018,width)
      addOutlet('outlet-insert',new RoundedBoxGeometry(width,.002,depth,2,.0007),[0,0,0],dark)
      for(const x of [-1,1]) addOutlet('outlet-bezel',new RoundedBoxGeometry(.0012,.0015,depth+.002,2,.0003),[x*(width/2+.0002),.0005,0],trim)
      for(const z of [-1,1]) addOutlet('outlet-bezel',new RoundedBoxGeometry(width+.002,.0015,.0012,2,.0003),[0,.0005,z*(depth/2+.0002)],trim)
      if(p.aeratorStyle==='slotted') for(let i=-2;i<=2;i++) addOutlet('outlet-grille',new RoundedBoxGeometry(.001,.001,depth*.85,1,.0002),[i*width*.16,.0015,0],trim)
      else if(p.aeratorStyle==='honeycomb') {
        const cell=.002
        for(let row=-2;row<=2;row++) for(let col=-12;col<=12;col++) {
          const x=col*cell*1.8+(row%2)*cell*.9, z=row*cell*1.55
          if(Math.abs(x)+cell>width*.46 || Math.abs(z)+cell>depth*.46) continue
          const grid=addOutlet('aerator-honeycomb',new RingGeometry(cell*.65,cell*.85,6),[x,.0015,z],trim);grid.rotation.x=-Math.PI/2
        }
      }
    } else {
      addOutlet('aerator',new CylinderGeometry(radius*.8,radius*.8,.003,40),[0,0,0],dark)
      const ring=addOutlet('aerator-bezel',new TorusGeometry(radius*.9,.0012,10,40),[0,0,0],trim);ring.rotation.x=Math.PI/2
      if(p.aeratorStyle==='honeycomb') {
        const cell = Math.min(.0025,radius*.2)
        for(let row=-3;row<=3;row++) for(let col=-3;col<=3;col++) {
          const x=col*cell*1.8+(row%2)*cell*.9, z=row*cell*1.55
          if(Math.hypot(x,z)+cell>radius*.78) continue
          const grid=addOutlet('aerator-honeycomb',new RingGeometry(cell*.65,cell*.85,6),[x,.0017,z],trim);grid.rotation.x=-Math.PI/2
        }
      } else if(p.aeratorStyle==='slotted') for(let i=-2;i<=2;i++) {
        const x=i*radius*.26, chord=2*Math.sqrt((radius*.73)**2-x*x)
        addOutlet('aerator-slot',new RoundedBoxGeometry(.0008,.0008,chord,1,.0001),[x,.0017,0],trim)
      }
    }
    return assembly
  }
  function ring(name: string, radius: number, position: [number,number,number], material = trim) {
    const part = add(name,new TorusGeometry(radius,.0012,10,48),position,material);part.rotation.x=Math.PI/2;return part
  }
  function base() {
    if(p.baseStyle==='none') return
    const radius=p.baseWidth/2
    if(p.baseStyle==='square') {
      box('base-gasket',[p.baseWidth*.96,.002,p.baseWidth*.96],[0,.001,0],dark)
      box('square-base',[p.baseWidth,p.baseHeight-.002,p.baseWidth],[0,(p.baseHeight+.002)/2,0],trim)
    } else {
      cylinder('base-gasket',radius*.96,.002,[0,.001,0],radius*.96,dark)
      cylinder('base-flange',radius,p.baseHeight-.002,[0,(p.baseHeight+.002)/2,0],radius*.96,trim)
      if(p.decorativeRings) ring('base-bead',radius*.97,[0,p.baseHeight-.001,0])
    }
  }
  if (p.design === 'plate' || p.design === 'mixer') {
    // Local wall plane is z=0. The fixture projects toward negative z.
    if (p.design === 'plate') {
      const plateRadius=r*(.052/.024)
      const plate = cylinder('oval-wall-plate',plateRadius,.009,[0,0,-.006]);plate.rotation.x=Math.PI/2;plate.scale.z=h/(2*plateRadius)
      box('wall-spout', [r*1.3,p.spoutDiameter,reach], [0,h*.15,-reach/2])
      outlet([0,h*.15-p.spoutDiameter/2,-reach+.015],r*.58,true)
      control('plate-control',[0,-h*.26,-.013],'front',.7)
      if(p.decorativeRings) { const rim=add('plate-edge-trim',new TorusGeometry(plateRadius*.96,.0015,10,64),[0,0,-.012],trim);rim.scale.y=h/(2*plateRadius) }
    } else {
      for (const x of [-p.wallSpacing/2,p.wallSpacing/2]) {
        const escutcheon = cylinder('wall-escutcheon',.035,.012,[x,0,-.01]); escutcheon.rotation.x=Math.PI/2
        const connector = cylinder('wall-connector',.019,.055,[x,0,-.037]); connector.rotation.x=Math.PI/2
        const seal=ring('wall-coupling-seal',.0195,[x,0,-.055],dark);seal.rotation.x=0
        if(p.decorativeRings) { const edge=ring('escutcheon-edge',.033,[x,0,-.017]);edge.rotation.x=0 }
      }
      const bar = cylinder('mixer-body',r,p.wallSpacing+.03,[0,0,-.068]); bar.rotation.z=Math.PI/2
      box('mixer-spout',[r*1.44,p.spoutDiameter,reach-.06],[.035,0,-.068-(reach-.06)/2])
      outlet([.035,-p.spoutDiameter/2,-reach+.014],r*.6,true)
      cylinder('mixer-valve-neck',r*.65,Math.max(.012,h*.4-r),[0,(r+h*.4)/2,-.065],r*.65,trim)
      lever(h*.4,-.065)
    }
    return group
  }
  const square = p.design === 'lever' || p.design === 'waterfall' || p.design === 'square-arc'
  if (square && p.design !== 'square-arc') {
    base()
    box('square-column',[r*1.8,h*.84,r*1.8],[0,h*.42+p.baseHeight,0])
    const width = p.design === 'waterfall' ? r*3.3 : r*1.8
    box('flat-spout',[width,p.spoutDiameter,reach],[0,h*(1-p.outletDrop),-reach/2])
    outlet([0,h*.73-p.spoutDiameter/2,-reach+.014],width*.5,true)
    if(p.design==='waterfall') box('waterfall-lip',[width*.94,.002,.022],[0,h*.73-p.spoutDiameter/2+.001,-reach+.012],trim)
    lever(h*.84+p.baseHeight,0)
    return group
  }
  base()
  if(p.design==='sculpted') {
    const points: [number,number,number][] = [[0,p.baseHeight,0],[0,h*.35,0],[0,h*.79,-reach*.07],[0,h*.84,-reach*.42],[0,h*(1-p.outletDrop*.85),-reach]]
    const curve = new CatmullRomCurve3(points.map(point=>new Vector3(...point)),false,'centripetal')
    const geometry = new TubeGeometry(curve,96,1,32,false), position = geometry.getAttribute('position')
    const radii=[r*1.1,r*.76,r*.8,r*.72,p.spoutDiameter/2]
    for(let i=0;i<=96;i++) {
      const u=i/96, center=curve.getPointAt(u), f=u*(radii.length-1), a=Math.min(radii.length-2,Math.floor(f)), weight=(1-Math.cos((f-a)*Math.PI))/2
      const radius=radii[a]!*(1-weight)+radii[a+1]!*weight
      for(let j=0;j<=32;j++) { const index=i*33+j;const vertex=new Vector3().fromBufferAttribute(position,index).sub(center).multiplyScalar(radius).add(center);position.setXYZ(index,vertex.x,vertex.y,vertex.z) }
    }
    geometry.computeVertexNormals()
    add('sculpted-body',geometry,[0,0,0])
    cylinder('sculpted-base-cap',r*1.1,.001,[0,p.baseHeight+.0005,0])
    control('top-control',[0,h*.84+r*.72,-reach*.2])
    const end=points.at(-1)!, nozzle=outlet([...end],p.spoutDiameter/2)
    nozzle.quaternion.setFromUnitVectors(new Vector3(0,1,0),curve.getTangentAt(1))
    return group
  }
  const vintage = p.design === 'vintage' || p.design === 'vintage-arc'
  const gripRadius=p.handleStyle==='cross' ? p.handleLength*.44+p.handleThickness*.8 : p.handleStyle==='wheel' ? p.handleLength*.34+p.handleThickness*.6 : .025
  const bodyHeight = p.design === 'vintage' ? h*.8 : Math.max(h*.38,Math.min(h*.7,gripRadius+.02))
  if (vintage || p.design === 'swan') {
    const profile = [[r*1.3,0],[r*1.15,.014],[r*.74,bodyHeight*.5],[r*.9,bodyHeight*.85],[r,bodyHeight]]
    add('shaped-column',new LatheGeometry([[0,0],...profile,[0,bodyHeight]].map(([x,y])=>new Vector2(x,y)),48),[0,p.baseHeight,0])
  } else cylinder('column',r,bodyHeight,[0,bodyHeight/2+p.baseHeight,0])
  if(p.decorativeRings) {
    ring('column-foot-trim',r*1.01,[0,p.baseHeight+.004,0])
    ring('column-cartridge-seam',r*1.005,[0,bodyHeight+p.baseHeight-.004,0],dark)
  }
  if (vintage) {
    if(p.decorativeRings) for (const y of [.025,bodyHeight*.85,bodyHeight]) {
      cylinder('decorative-collar',r*1.28,.008,[0,y,0],r*1.28,trim)
      ring('collar-bead',r*1.28,[0,y+.004,0])
    }
    cylinder('valve-neck',r*.6,.018,[0,bodyHeight+.017,0],r*.6,trim)
    control('traditional-control',[0,bodyHeight+.025,0])
  } else if (p.design === 'twin') {
    for (const sign of [-1,1]) control('hot-cold-knob',[sign*(r-.002),Math.max(.045,gripRadius*.75+.005,bodyHeight*.52),-.012],sign<0?'left':'right',.75)
  }
  else control('side-control',[(p.handleSide==='left'?-1:1)*(r-.002),Math.max(.045,gripRadius+.005,bodyHeight*.62),0],p.handleSide)
  let points: [number,number,number][]
  if (p.design === 'vintage') points=[[0,bodyHeight*.8,0],[0,h*.86,-reach*.36],[0,h*.84,-reach*.8],[0,h*(1-p.outletDrop),-reach]]
  else if (p.design === 'square-arc') points=[[0,bodyHeight,0],[0,h*.92,0],[0,h,-.025],[0,h,-reach+.025],[0,h*.93,-reach],[0,h*(1-p.outletDrop),-reach]]
  else points=[[0,bodyHeight*.8,0],[0,h*.85,0],[0,h,-reach*.4],[0,h*.94,-reach*.82],[0,h*(1-p.outletDrop),-reach]]
  const spoutRadius = p.spoutDiameter/2
  const curve=pipe('spout',points,spoutRadius,p.design==='square-arc',finish)
  const end=points[points.length-1]!
  const aerator = outlet([...end],spoutRadius,p.design==='square-arc')
  aerator.quaternion.setFromUnitVectors(new Vector3(0,1,0),curve.getTangentAt(1))
  if (p.design === 'spring') {
    const frames=curve.computeFrenetFrames(240,false), coil: [number,number,number][]=[]
    const coilSegments=p.springTurns*24
    for(let i=0;i<=coilSegments;i++) {
      const u=i/coilSegments, frame=Math.round(u*240), angle=u*Math.PI*2*p.springTurns
      const point=curve.getPointAt(u).addScaledVector(frames.normals[frame]!,Math.cos(angle)*p.springRadius).addScaledVector(frames.binormals[frame]!,Math.sin(angle)*p.springRadius)
      coil.push([point.x,point.y,point.z])
    }
    pipe('spring-coil',coil,.0025,false,trim)
    const spray=cylinder('pullout-spray-head',r*.65,p.sprayHeadLength,[0,end[1]-p.sprayHeadLength/2,-reach],r*.55,trim)
    ring('spray-head-collar',r*.62,[0,end[1]-.006,-reach])
    ring('spray-head-seal',r*.66,[0,end[1]-p.sprayHeadLength+.007,-reach],dark)
    if(p.sprayButton) box('spray-mode-button',[.007,p.sprayHeadLength*.35,.012],[r*.64,spray.position.y,-reach],dark)
    outlet([0,end[1]-p.sprayHeadLength,-reach],r*.58)
    pipe('support-arm',[[0,bodyHeight*.75,0],[0,bodyHeight*.95,-reach*.5],[0,end[1]-.035,-reach]],.006)
  }
  return group
}

/** Three physical mounts share one logical tap node and replacement slot. */
export function buildTapGeometry(node: TapNode, ctx?: GeometryContext): Group {
  const group = buildSingleTapGeometry(node), p = tapDimensions(node)
  if (p.mountingLayout === 'three-hole' && p.mount !== 'wall') {
    for (const child of [...group.children]) if (['top-control', 'side-control', 'traditional-control', 'hot-cold-knob'].includes(child.name)) { group.remove(child); child.traverse(part => { if (part instanceof Mesh) part.geometry.dispose() }) }
    for (const sign of [-1, 1]) {
    // Reuse the detailed cartridge, hub and pivot geometry in separate deck controls.
    const donor = buildSingleTapGeometry({ ...node, presetId: 'tap-002', mountingLayout: 'single-hole', handleStyle: node.handleStyle === 'auto' || !node.handleStyle ? 'cross' : node.handleStyle })
    const control = donor.getObjectByName('top-control')!
    donor.remove(control)
    const mount = new Group(); mount.name = sign < 0 ? 'three-hole-hot' : 'three-hole-cold'; mount.userData.mountingSign = sign
    mount.position.x = sign * p.holeSpacing / 2
    const mountHeight = Math.max(.028, p.handleLength * Math.abs(Math.sin(node.handleAngle ?? 0)) + .012)
    control.position.set(0, mountHeight, 0); mount.add(control)
    const material = ((group.getObjectByName('base-flange') ?? group.getObjectByName('square-base')) as Mesh)?.material ?? (group.children.find(part => part instanceof Mesh) as Mesh).material
    const base = new Mesh(new CylinderGeometry(.024, .027, mountHeight, 40), material); base.position.y = mountHeight / 2; base.name = 'handle-mount'; mount.add(base)
    control.traverse(part => { if (part.name === 'temperature-marker' && part instanceof Mesh) part.visible = sign < 0 ? part.position.x > 0 : part.position.x < 0 })
    group.add(mount)
    const retained = new Set<MeshStandardMaterial>()
    control.traverse(part => { if (part instanceof Mesh) for (const material of Array.isArray(part.material) ? part.material : [part.material]) retained.add(material) })
    donor.traverse(part => { if (part instanceof Mesh) { part.geometry.dispose(); for (const material of Array.isArray(part.material) ? part.material : [part.material]) if (!retained.has(material)) material.dispose() } })
    }
  }
  const originals = new Set<MeshStandardMaterial>()
  const resolved = new Map<string, MeshStandardMaterial>()
  group.traverse(object => {
    if (!(object instanceof Mesh)) return
    const slot = object.userData.slotId === 'handle' ? 'handle' : object.userData.slotId === 'body' ? 'body' : 'trim'
    const ref = node.slots?.[slot]
    let material: MeshStandardMaterial | null | undefined = resolved.get(slot)
    if (!material) {
      material = ref ? resolveMaterialRef(ref, ctx?.materials, 'rendered') as MeshStandardMaterial | null : null
      material ??= createDefaultMaterial('#ffffff', 0.22, 'rendered') as MeshStandardMaterial
      resolved.set(slot, material)
    }
    for (const original of Array.isArray(object.material) ? object.material : [object.material])
      if (!original.userData.__pascalCachedMaterial) originals.add(original as MeshStandardMaterial)
    object.material = material
    object.userData.__fromGeometry = true
    object.userData.slotId = slot
  })
  for (const material of originals) if (![...resolved.values()].includes(material)) material.dispose()
  return group
}
