import { describe, expect, test } from 'bun:test'
import { Box3, Group, Mesh, Vector3, type MeshStandardMaterial } from 'three'
import { MaterialSchema, useScene, type AnyNode, type AnyNodeId, type GeometryContext } from '@pascal-app/core'
import { buildFreestandingVanityGeometry, vanityGeometryKey } from './geometry'
import { FreestandingVanityNode, VanityParameters } from './schema'
import { vanityPresets } from './presets'
import { vanityPaint } from './paint'
import { isVanitySlot, vanitySlots } from './slots'
import { vanityParameterGroups } from './parametrics'

function node(patch: Partial<VanityParameters> = {}) {
  return FreestandingVanityNode.parse(patch)
}

function dispose(group: Group) {
  const materials = new Set<Mesh['material']>()
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return
    object.geometry.dispose()
    materials.add(object.material)
  })
  for (const material of materials) if (!Array.isArray(material) && !material.userData.__pascalCachedMaterial) material.dispose()
}

describe('freestanding vanity model', () => {
  test('existing dimension-only vanities acquire complete defaults', () => {
    const existing = node({ width: 1.2, height: 0.85, depth: 0.5 })
    expect(existing.width).toBe(1.2)
    expect(existing.frontStyle).toBe('shaker')
    expect(existing.drawerRows).toBe(2)
    expect(existing.baseStyle).toBe('tapered')
    expect(existing.drawerOpen).toBe(0)
  })

  test('presets generate distinct parts without a basin', () => {
    const keys = new Set<string>()
    for (const preset of vanityPresets) {
      const current = node(preset.settings)
      keys.add(vanityGeometryKey(current))
      const group = buildFreestandingVanityGeometry(current)
      expect(group.getObjectByName('vanity-countertop')).toBeDefined()
      const names: string[] = []
      group.traverse((object) => names.push(object.name))
      expect(names.some((name) => /basin|sink/.test(name))).toBe(false)
      if (preset.id === 'fluted') expect(names.some((name) => name.includes('-flute-'))).toBe(true)
      if (preset.id === 'console') expect(group.getObjectByName('vanity-console-shelf')).toBeDefined()
      dispose(group)
    }
    expect(keys.size).toBe(vanityPresets.length)
  })

  test('storage, front and base combinations remain finite at minimum and maximum sizes', () => {
    for (const storageLayout of VanityParameters.shape.storageLayout.unwrap().options) {
      for (const frontStyle of VanityParameters.shape.frontStyle.unwrap().options) {
        for (const baseStyle of VanityParameters.shape.baseStyle.unwrap().options) {
          for (const small of [true, false]) {
            const current = node({ storageLayout, frontStyle, baseStyle,
              width: small ? 0.55 : 1.8, height: small ? 0.55 : 1.1, depth: small ? 0.35 : 0.75,
              legHeight: 0.3, panelThickness: 0.03, countertopThickness: 0.06, frontGap: 0.012,
              drawerRows: 4, drawerColumns: 3, doorCount: 4, frontMount: 'inset', drawerType: 'standard',
              drawerOpen: 1, doorOpen: 110, fluteSpacing: 0.012, lowerShelf: true })
            const group = buildFreestandingVanityGeometry(current)
            group.traverse((object) => {
              if (!(object instanceof Mesh)) return
              const attributes = object.geometry.getAttribute('position')
              for (const value of attributes.array) expect(Number.isFinite(value)).toBe(true)
              const parameters = object.geometry.parameters as Record<string, number> | undefined
              for (const key of ['width', 'height', 'depth']) {
                if (parameters?.[key] !== undefined) expect(parameters[key]!).toBeGreaterThan(0)
              }
            })
            const bounds = new Box3().setFromObject(group)
            expect(bounds.min.y).toBeCloseTo(0, 5)
            expect(bounds.getSize(new Vector3()).y).toBeCloseTo(current.height, 5)
            dispose(group)
          }
        }
      }
    }
  })

  test('drawers slide outward with solid rectangular backs', () => {
    const closed = buildFreestandingVanityGeometry(node({ drawerType: 'standard' }))
    const opened = buildFreestandingVanityGeometry(node({ drawerType: 'standard', drawerOpen: 1 }))
    expect(opened.getObjectByName('vanity-drawer-0-0')!.position.z).toBeLessThan(closed.getObjectByName('vanity-drawer-0-0')!.position.z)
    expect(opened.getObjectByName('vanity-drawer-0-0-notch-front')).toBeUndefined()
    expect(opened.getObjectByName('vanity-drawer-0-0-back')).toBeDefined()
    dispose(closed)
    dispose(opened)
  })

  test('paired doors swing outward in opposite directions', () => {
    const group = buildFreestandingVanityGeometry(node({ storageLayout: 'doors', doorOpen: 90 }))
    expect(group.getObjectByName('vanity-door-0-0')!.rotation.y).toBeCloseTo(Math.PI / 2)
    expect(group.getObjectByName('vanity-door-0-1')!.rotation.y).toBeCloseTo(-Math.PI / 2)
    expect(group.getObjectByName('vanity-shelf-0-0')).toBeDefined()
    dispose(group)
  })

  test('cabinet-only mode removes the top and backsplash while preserving total height', () => {
    const group = buildFreestandingVanityGeometry(node({ countertopEnabled: false, backsplashHeight: 0.1 }))
    expect(group.getObjectByName('vanity-countertop')).toBeUndefined()
    expect(group.getObjectByName('vanity-backsplash')).toBeUndefined()
    expect(new Box3().setFromObject(group).max.y).toBeCloseTo(0.82)
    dispose(group)
  })

  test('construction parameters participate in the geometry key; pose does not', () => {
    const original = node()
    const key = vanityGeometryKey(original)
    for (const [field, value] of Object.entries(VanityParameters.shape)) {
      if (field === 'drawerOpen' || field === 'doorOpen') continue
      if (field === 'storageBays') {
        const parsed = FreestandingVanityNode.parse({ ...original, storageBays: [{ id: 'section-1', kind: 'open' }] })
        expect(vanityGeometryKey(parsed)).not.toBe(key)
        continue
      }
      const current = original[field as keyof VanityParameters]
      const schema = field === 'drawerType' ? { options: ['standard', 'shallow-top'] }
        : value.unwrap() as unknown as { options?: string[] }
      const next = schema.options ? schema.options.find((option) => option !== current)
        : typeof current === 'number' ? current + 0.001
        : typeof current === 'boolean' ? !current : '#123456'
      const candidate = { ...original, [field]: next }
      // Integer parameters need a whole step; bounds stay enforced by the schema.
      if (['drawerRows', 'drawerColumns', 'doorCount', 'interiorShelves'].includes(field)) candidate[field] = Number(current) + 1
      const parsed = FreestandingVanityNode.parse(candidate)
      expect(vanityGeometryKey(parsed)).not.toBe(key)
    }
    expect(vanityGeometryKey({ ...original, position: [3, 2, 1], rotation: 0.7 })).toBe(key)
    expect(vanityGeometryKey({ ...original, drawerOpen: 1, doorOpen: 90 })).toBe(key)
  })

  test('every preset starts white without textures or paint assignments', () => {
    for (const preset of vanityPresets) {
      const current = node(preset.settings)
      expect(current.slots).toBeUndefined()
      const group = buildFreestandingVanityGeometry(current)
      group.traverse((object) => {
        if (!(object instanceof Mesh)) return
        const material = object.material as MeshStandardMaterial
        expect(material.color.getHexString()).toBe('ffffff')
        expect(material.map).toBeNull()
        expect(isVanitySlot(object.userData.slotId)).toBe(true)
      })
      dispose(group)
    }
    expect(vanityParameterGroups.flatMap((group) => group.fields).some((field) => field.kind === 'color' || field.kind === 'material' || /finish|color|material/i.test(field.key))).toBe(false)
  })

  test('paint previews isolate each component group and restore on cancellation', () => {
    const current = node({ storageLayout: 'mixed' })
    const group = buildFreestandingVanityGeometry(current)
    const material = MaterialSchema.parse({ properties: { color: '#cc5522' } })
    for (const { slotId } of vanitySlots()) {
      const affected: Mesh[] = []
      group.traverse((object) => { if (object instanceof Mesh && object.userData.slotId === slotId) affected.push(object) })
      expect(affected.length).toBeGreaterThan(0)
      const originals = affected.map((mesh) => mesh.material)
      const restore = vanityPaint.applyPreview({ node: current as unknown as AnyNode, root: group, role: slotId, material, materialPreset: undefined })
      expect(restore).not.toBeNull()
      group.traverse((object) => {
        if (!(object instanceof Mesh)) return
        expect((object.material as MeshStandardMaterial).color.getHexString()).toBe(object.userData.slotId === slotId ? 'cc5522' : 'ffffff')
      })
      restore!()
      affected.forEach((mesh, index) => expect(mesh.material).toBe(originals[index]))
      expect(vanityPaint.resolveRole({ node: current as unknown as AnyNode, materialIndex: null, hitObject: affected[0] })).toBe(slotId)
    }
    dispose(group)
  })

  test('painting stores palette refs atomically, survives rebuilding, reuses materials, and resets to white', () => {
    const originalState = useScene.getState()
    const current = node()
    const id = current.id as AnyNodeId
    const material = MaterialSchema.parse({ properties: { color: '#cc5522' } })
    useScene.setState({ nodes: { [id]: current as unknown as AnyNode }, materials: {}, readOnly: false })
    let edits = 0
    const unsubscribe = useScene.subscribe((next, previous) => {
      if (next.nodes !== previous.nodes || next.materials !== previous.materials) edits++
    })
    try {
      const args = { node: current as unknown as AnyNode, role: 'front', material, materialPreset: undefined }
      vanityPaint.commit!(args)
      expect(edits).toBe(1)
      const state = useScene.getState()
      const painted = FreestandingVanityNode.parse(state.nodes[id])
      expect(painted.slots?.front).toMatch(/^scene:mat_/)
      expect(vanityGeometryKey(painted)).not.toBe(vanityGeometryKey(current))
      const ctx = { materials: state.materials } as GeometryContext
      const group = buildFreestandingVanityGeometry(painted, ctx)
      expect((group.getObjectByName('vanity-drawer-0-0-panel') as Mesh).material.color.getHexString()).toBe('cc5522')
      expect((group.getObjectByName('vanity-countertop') as Mesh).material.color.getHexString()).toBe('ffffff')
      dispose(group)
      vanityPaint.commit!({ ...args, role: 'hardware' })
      expect(Object.keys(useScene.getState().materials)).toHaveLength(1)
      expect(vanityPaint.getEffectiveMaterial!({ node: useScene.getState().nodes[id]!, role: 'front', nodes: useScene.getState().nodes })?.material).toEqual(material)
      vanityPaint.commit!({ ...args, role: 'front', material: undefined })
      const reset = FreestandingVanityNode.parse(useScene.getState().nodes[id])
      expect(reset.slots?.front).toBeUndefined()
      expect(reset.slots?.hardware).toBe(painted.slots?.front)
      const resetGroup = buildFreestandingVanityGeometry(reset, { materials: useScene.getState().materials } as GeometryContext)
      expect((resetGroup.getObjectByName('vanity-drawer-0-0-panel') as Mesh).material.color.getHexString()).toBe('ffffff')
      dispose(resetGroup)
    } finally {
      unsubscribe()
      useScene.setState(originalState, true)
    }
  })
})
