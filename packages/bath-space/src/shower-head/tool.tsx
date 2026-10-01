'use client'
import {
  emitter,
  sceneRegistry,
  useScene,
  getEffectiveNode,
  type AnyNode,
  type AnyNodeId,
  type GridEvent,
} from '@pascal-app/core'
import { useEditor, usePlacementPreview, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useThree, createPortal } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { Mesh, Ray, Raycaster, Vector2, Vector3, type Material } from 'three'
import { basinPlacement } from '../countertop-basin/placement'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import { ShowerArmNode } from '../shower-arm/schema'
import { ShowerHeadNode, showerHeadPresets } from './schema'
import { buildShowerHeadGeometry } from './geometry'
import { useShowerHeadStyle } from './placement-settings'
import {
  attachShowerHead,
  showerArmFromHit,
  showerHeadLevelPose,
  showerHeadHost,
} from './attachment'
export default function ShowerHeadTool({ node: source }: { node?: ShowerHeadNode }) {
  const { camera, gl } = useThree(),
    style = useShowerHeadStyle(),
    selectedLevel = useViewer((s) => s.selection.levelId)
  const levelId = source ? vanityLevelId(source.parentId, useScene.getState().nodes) : selectedLevel
  const node = useMemo(
    () =>
      ShowerHeadNode.parse(
        source ?? { ...showerHeadPresets.find((p) => p.style === style), name: 'Shower head' },
      ),
    [source, style],
  )
  const ghost = useMemo(() => {
    const root = buildShowerHeadGeometry(node)
    root.traverse((o) => {
      if (o instanceof Mesh) {
        const original = o.material as Material
        const material = original.userData.__pascalCachedMaterial ? original.clone() : original
        material.transparent = true
        material.opacity = 0.5
        material.depthWrite = false
        o.material = material
        o.raycast = () => {}
      }
    })
    return root
  }, [node])
  const [target, setTarget] = useState<ReturnType<typeof showerHeadLevelPose> | null>(null)
  useEffect(() => {
    if (!levelId) return
    const level = sceneRegistry.nodes.get(levelId)
    if (!level) return
    const canvas = gl.domElement,
      raycaster = new Raycaster(),
      hidden = new Map<Mesh | import('three').Object3D, boolean>()
    const original = source ? sceneRegistry.nodes.get(source.id) : undefined
    if (original) original.visible = false
    const restore = () => {
      for (const [o, visible] of hidden) o.visible = visible
      hidden.clear()
    }
    const candidate = (ray: Ray) => {
      const hit = basinPlacement(
        ray,
        level,
        level.matrixWorld,
        0,
        0,
        original ? [ghost, original] : [ghost],
      )
      return hit?.surface
        ? showerArmFromHit(hit.surface, sceneRegistry.nodes, useScene.getState().nodes)
        : null
    }
    const show = (id: string | null) => {
      restore()
      const raw = id ? useScene.getState().nodes[id as AnyNodeId] : null,
        root = id ? sceneRegistry.nodes.get(id) : null
      const pose = raw && root ? showerHeadLevelPose(showerHeadHost(raw)!.node, root, level) : null
      setTarget(pose)
      if (raw && pose) {
        for (const childId of showerHeadHost(raw)!.node.children) {
          const child = useScene.getState().nodes[childId as AnyNodeId]
          if (
            child &&
            String(child.type) === 'bath-space:shower-head' &&
            String(child.id) !== source?.id
          ) {
            const object = sceneRegistry.nodes.get(childId)
            if (object) {
              hidden.set(object, object.visible)
              object.visible = false
            }
          }
        }
        usePlacementPreview
          .getState()
          .set(
            { ...node, parentId: levelId, position: pose.position } as unknown as AnyNode,
            useScene.getState().nodes[levelId] ?? null,
          )
      } else usePlacementPreview.getState().clear()
    }
    const resolve = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      raycaster.setFromCamera(
        new Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      )
      return candidate(raycaster.ray)
    }
    const place = (id: string | null) => {
      const state = useScene.getState()
      if (!id || state.readOnly) return
      const { placed, changes } = attachShowerHead(node, id, state.nodes, source?.id)
      show(null)
      state.applyNodeChanges(changes)
      useViewer.getState().setSelection({ selectedIds: [placed.id] })
      triggerSFX('sfx:item-place')
      if (source) useEditor.getState().setMovingNode(null)
    }
    const move = (e: PointerEvent) => show(resolve(e)),
      click = (e: MouseEvent) => {
        if (e.button === 0 && !useViewer.getState().cameraDragging) place(resolve(e))
      },
      leave = () => show(null)
    const plan = (e: GridEvent) => {
      const point = new Vector3(...e.position)
      const ray = new Ray(new Vector3(point.x, point.y + 10000, point.z), new Vector3(0, -1, 0))
      return candidate(ray)
    }
    const planMove = (e: GridEvent) => {
        if (e.nativeEvent.target !== canvas) show(plan(e))
      },
      planClick = (e: GridEvent) => {
        if (e.nativeEvent.target !== canvas) place(plan(e))
      }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (source) useEditor.getState().setMovingNode(null)
        else useEditor.getState().setTool(null)
      }
    }
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('click', click)
    canvas.addEventListener('pointerleave', leave)
    emitter.on('grid:move', planMove)
    emitter.on('grid:click', planClick)
    window.addEventListener('keydown', key)
    return () => {
      restore()
      if (original) original.visible = source?.visible !== false
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('click', click)
      canvas.removeEventListener('pointerleave', leave)
      emitter.off('grid:move', planMove)
      emitter.off('grid:click', planClick)
      window.removeEventListener('keydown', key)
      usePlacementPreview.getState().clear()
    }
  }, [camera, gl, levelId, node, ghost, source])
  useEffect(
    () => () => {
      const materials = new Set<Material>()
      ghost.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose()
          materials.add(o.material as Material)
        }
      })
      for (const m of materials) m.dispose()
    },
    [ghost],
  )
  const level = levelId ? sceneRegistry.nodes.get(levelId) : null
  return level && target
    ? createPortal(
        <primitive object={ghost} position={target.position} quaternion={target.quaternion} />,
        level,
      )
    : null
}
