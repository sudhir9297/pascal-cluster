import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { Box3, Mesh, Vector3 } from 'three'
import { tapPresets } from './presets'
import { TapNode } from './schema'
import { tapHandles } from './handles'
import { tapDefinition } from './definition'
import { buildTapGeometry, tapDimensions, tapGeometryKey } from './geometry'

function inspect(node: TapNode) {
  const model = buildTapGeometry(node)
  const bounds = new Box3().setFromObject(model,true)
  expect(bounds.isEmpty()).toBe(false)
  model.traverse(part => {
    if (!(part instanceof Mesh)) return
    for (const name of ['position','normal','uv']) {
      const attribute = part.geometry.getAttribute(name)
      if (attribute) expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true)
    }
    part.geometry.dispose()
    for (const material of Array.isArray(part.material) ? part.material : [part.material]) material.dispose()
  })
  return bounds
}

describe('procedural tap models', () => {
  test('all tap designs build finite geometry at defaults and dimension limits', () => {
    expect(tapPresets.filter(preset => preset.mount === 'countertop')).toHaveLength(15)
    expect(tapPresets.filter(preset => preset.mount === 'wall')).toHaveLength(2)
    for (const preset of tapPresets) {
      for (const limits of [{}, { height: .12, reach: .1, bodyRadius: .012 }, { height: .6, reach: .3, bodyRadius: .04 }]) {
        const bounds = inspect(TapNode.parse({ presetId: preset.id, ...limits }))
        if (preset.mount === 'countertop') expect(bounds.min.y).toBeCloseTo(0, 5)
        else expect(bounds.max.z).toBeLessThanOrEqual(.001)
      }
      const png = readFileSync(new URL(preset.thumbnail))
      expect(png.toString('hex',0,8)).toBe('89504e470d0a1a0a')
      expect('model' in preset).toBe(false)
    }
  })
  test('height and reach rebuild geometry while pose does not', () => {
    const node = TapNode.parse({ presetId: 'tap-001' })
    const base = inspect(node).getSize(new Vector3())
    const taller = inspect({ ...node, height: .5 }).getSize(new Vector3())
    const longer = inspect({ ...node, reach: .28 }).getSize(new Vector3())
    expect(taller.y).toBeGreaterThan(base.y)
    expect(longer.z).toBeGreaterThan(base.z)
    expect(tapGeometryKey({ ...node, position: [1,2,3], rotation: 1 })).toBe(tapGeometryKey(node))
    expect(tapGeometryKey({ ...node, handleAngle: .3 })).not.toBe(tapGeometryKey(node))
    expect(tapGeometryKey(TapNode.parse({ ...node, finish: 'black' }))).toBe(tapGeometryKey(node))
    expect(tapGeometryKey({ ...node, slots: { body: 'scene-material:test' } })).not.toBe(tapGeometryKey(node))
    expect(tapDimensions(TapNode.parse({ presetId: 'tap-010' })).height).toBe(.48)
  })
  test('distinct assemblies contain their defining parts', () => {
    for (const [id, name] of [['tap-010','spring-coil'],['tap-013','hot-cold-knob'],['tap-003','oval-wall-plate'],['tap-016','mixer-body']] as const) {
      const node = TapNode.parse({ presetId: id }), model = buildTapGeometry(node)
      expect(model.getObjectByName(name)).toBeDefined()
      inspect(node)
    }
    expect(TapNode.safeParse({ presetId: 'missing' }).success).toBe(false)
    expect(tapDefinition.geometry).toBe(buildTapGeometry)
    expect(tapDefinition.tool).toBeDefined()
  })
})

test('all tap handles have connected cartridge assemblies and all detail variations stay finite', () => {
  for (const preset of tapPresets) {
    for (const style of ['lever','pin','cross','wheel'] as const) {
      const node=TapNode.parse({ presetId:preset.id,handleStyle:style,handleAngle:-.5,handleLength:.12,handleThickness:.018,
        spoutDiameter:.05,baseWidth:.14,baseHeight:.025,outletDrop:.4,finish:'brass',trimFinish:'gunmetal',surfaceTreatment:'brushed',
        springTurns:44,springRadius:.035,sprayHeadLength:.09,wallSpacing:.22 })
      const model=buildTapGeometry(node)
      expect(model.getObjectByName('cartridge-housing')).toBeDefined()
      expect(model.getObjectByName('handle-pivot')).toBeDefined()
      expect(model.getObjectByName(style==='lever' ? 'lever-handle' : style==='pin' ? 'pin-handle' : style==='cross' ? 'cross-handle-arm' : 'wheel-handle')).toBeDefined()
      const bounds=inspect(node)
      if(preset.mount==='countertop') expect(bounds.min.y).toBeGreaterThanOrEqual(-.001)
      else expect(bounds.max.z).toBeLessThanOrEqual(.001)
      const short=TapNode.parse({...node,height:.12,bodyRadius:.012,baseStyle:'none'})
      const shortBounds=inspect(short)
      if(preset.mount==='countertop') expect(shortBounds.min.y).toBeGreaterThanOrEqual(-.001)
      else expect(shortBounds.max.z).toBeLessThanOrEqual(.001)
    }
  }
})

test('outlet, marker, base and spring options change visible model parts and geometry caching', () => {
  const original=TapNode.parse({})
  const grid=buildTapGeometry(original)
  expect(grid.getObjectByName('aerator-honeycomb')).toBeDefined()
  expect(grid.getObjectByName('temperature-marker')).toBeDefined()
  const minimal=TapNode.parse({baseStyle:'none',aeratorEnabled:false,temperatureMarkers:false,decorativeRings:false})
  const model=buildTapGeometry(minimal)
  expect(model.getObjectByName('aerator')).toBeUndefined()
  expect(model.getObjectByName('temperature-marker')).toBeUndefined()
  expect(model.getObjectByName('base-flange')).toBeUndefined()
  expect(inspect(minimal).min.y).toBeCloseTo(0)
  expect(tapGeometryKey(minimal)).not.toBe(tapGeometryKey(original))
  const styles=['slotted','plain'] as const
  for(const aeratorStyle of styles) expect(tapGeometryKey({...original,aeratorStyle})).not.toBe(tapGeometryKey(original))
  for(const key of ['springTurns','springRadius','sprayHeadLength','wallSpacing','handleLength','handleThickness','spoutDiameter','outletDrop','baseWidth','baseHeight'] as const) {
    const value=tapDimensions(original)[key]
    expect(tapGeometryKey({...original,[key]:value+(key==='springTurns'?1:.001)})).not.toBe(tapGeometryKey(original))
  }
})

test('selection arrows resize the model without detaching or moving its mounting origin', () => {
  for(const preset of tapPresets) {
    const node=TapNode.parse({presetId:preset.id,parentId:'basin-host',position:[.1,.2,.3]})
    const handles=tapHandles(node)
    const arrows=handles.filter(handle=>handle.kind==='linear-resize')
    expect(arrows).toHaveLength(3)
    expect(handles.some(handle=>handle.kind==='tap-action')).toBe(true)
    for(const handle of arrows) {
      if(handle.kind!=='linear-resize') continue
      for(const value of [handle.min!,handle.max!]) {
        const patch=handle.apply(node,value,{} as never)
        expect(patch.position).toBeUndefined()
        expect(patch.parentId).toBeUndefined()
        const next=TapNode.parse({...node,...patch})
        if(value!==handle.currentValue(node)) expect(tapGeometryKey(next)).not.toBe(tapGeometryKey(node))
        expect(handle.placement.position(next,{} as never).every(Number.isFinite)).toBe(true)
      }
    }
  }
})
