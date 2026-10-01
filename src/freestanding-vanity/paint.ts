import {
  generateSceneMaterialId, parseMaterialRef, toSceneMaterialRef, useScene,
  type AnyNode, type AnyNodeId, type PaintCapability, type SceneMaterialId,
} from '@pascal-app/core'
import { createDefaultMaterial, createMaterial, resolveMaterialRef, useViewer } from '@pascal-app/viewer'
import type { Material, Mesh, Object3D } from 'three'
import { isVanitySlot } from './slots'

type PaintNode = AnyNode & { slots?: Record<string, string> }

export function createSlotPaint(isSlot: (value: unknown) => value is string, defaultRoughness = 0.6): PaintCapability {
  return {
    materialTarget: 'cabinet',
    resolveRole: ({ hitObject }) => {
      const slot = hitObject?.userData?.slotId
      return isSlot(slot) ? slot : null
    },
    buildPatch: ({ node, role, materialPreset }) => {
      if (!isSlot(role)) return {}
      const slots = { ...(node as PaintNode).slots }
      if (materialPreset) slots[role] = materialPreset
      else delete slots[role]
      return { slots } as Partial<AnyNode>
    },
    commit: ({ node, role, material, materialPreset }) => {
      if (!isSlot(role)) return
      const nodeId = node.id as AnyNodeId
      useScene.setState((state) => {
        if (state.readOnly) return state
        const current = state.nodes[nodeId] as PaintNode | undefined
        if (!current) return state
        const slots = { ...current.slots }
        let ref = materialPreset
        let materials = state.materials
        if (!ref && material) {
          const existing = Object.values(materials).find((entry) => JSON.stringify(entry.material) === JSON.stringify(material))
          const id = existing?.id ?? generateSceneMaterialId()
          ref = toSceneMaterialRef(id)
          if (!existing) materials = { ...materials, [id]: { id, name: `Material ${Object.keys(materials).length + 1}`, material } }
        }
        if (ref) slots[role] = ref
        else delete slots[role]
        return { materials, nodes: { ...state.nodes, [nodeId]: { ...current, slots } as AnyNode } }
      })
      useScene.getState().markDirty(nodeId)
    },
    applyPreview: ({ node, role, root, material, materialPreset }) => {
      if (!isSlot(role)) return null
      const shading = useViewer.getState().shading
      const preview = materialPreset ? resolveMaterialRef(materialPreset, useScene.getState().materials, shading)
        : material ? createMaterial(material, shading) : createDefaultMaterial('#ffffff', defaultRoughness, shading)
      if (!preview) return null
      const previous: Array<[Mesh, Material | Material[]]> = []
      ;(root as Object3D).traverse((object) => {
        const mesh = object as Mesh
        if (!mesh.isMesh || mesh.userData.__fromGeometry !== true || mesh.userData.slotId !== role) return
        previous.push([mesh, mesh.material])
        mesh.material = preview
      })
      const owned = !preview.userData.__pascalCachedMaterial
      if (!previous.length) {
        if (owned) preview.dispose()
        return null
      }
      let finished = false
      const finish = (committed: boolean) => {
        if (finished) return
        finished = true
        if (committed) useScene.getState().markDirty(node.id as AnyNodeId)
        else for (const [mesh, original] of previous) mesh.material = original
        if (owned) preview.dispose()
      }
      return Object.assign(() => finish(false), { commit: () => finish(true) })
    },
    getEffectiveMaterial: ({ node, role }) => {
      if (!isSlot(role)) return null
      const ref = (node as PaintNode).slots?.[role]
      const parsed = parseMaterialRef(ref)
      if (parsed?.kind === 'library') return { material: undefined, materialPreset: ref }
      if (parsed?.kind === 'scene') {
        const material = useScene.getState().materials[parsed.id as SceneMaterialId]?.material
        if (material) return { material, materialPreset: undefined }
      }
      return null
    },
  }
}

export const vanityPaint = createSlotPaint(isVanitySlot)
