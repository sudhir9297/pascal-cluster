'use client'
import { showerSupplyHost } from '../shower-common/supply-host'
import { emitter, sceneRegistry, useScene, type AnyNodeId, type GridEvent } from '@pascal-app/core'
import { useEditor, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { createPortal, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { Ray, Raycaster, Vector2, Vector3, Mesh, type Material } from 'three'
import { basinPlacement } from '../countertop-basin/placement'
import { HAND_SHOWER } from '../hand-shower/schema'
import { ShowerHoseNode } from './schema'
import { buildHoseAt } from './geometry'
import { connectShowerHose, hoseConnection } from './connection'
import { useShowerHoseStyle, setShowerHoseStage } from './placement-settings'
export default function ShowerHoseTool({ node: source }: { node?: ShowerHoseNode }) {
  const { camera, gl } = useThree(),
    style = useShowerHoseStyle(),
    levelId = useViewer((s) => s.selection.levelId),
    node = useMemo(
      () => ShowerHoseNode.parse(source ?? { style, name: 'Shower hose' }),
      [source, style],
    )
  const [outlet, setOutlet] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const preview = useMemo(() => {
    if (!outlet || !hover) return null
    const pose = hoseConnection(
      { ...node, parentId: outlet, targetId: hover },
      (id) => useScene.getState().nodes[id as AnyNodeId],
    )
    if (!pose) return null
    const root = buildHoseAt(node, pose.end, pose.endDirection)
    root.position.setFromMatrixPosition(pose.sourceMatrix)
    root.quaternion.setFromRotationMatrix(pose.sourceMatrix)
    root.traverse((o) => {
      if (o instanceof Mesh) {
        const m = o.material as Material
        o.material = m.userData.__pascalCachedMaterial ? m.clone() : m
        const material = o.material as Material
        material.transparent = true
        material.opacity = 0.5
        material.depthWrite = false
        o.raycast = () => {}
      }
    })
    return root
  }, [node, outlet, hover])
  useEffect(
    () => () => {
      preview?.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose()
          ;(o.material as Material).dispose()
        }
      })
    },
    [preview],
  )
  useEffect(() => {
    setShowerHoseStage(
      outlet
        ? 'Outlet chosen. Click a mounted handset to connect.'
        : 'Click a supply outlet, then a mounted handset.',
    )
    if (!levelId) return
    const level = sceneRegistry.nodes.get(levelId)
    if (!level) return
    const canvas = gl.domElement,
      raycaster = new Raycaster()
    const hit = (ray: Ray) => {
      const found = basinPlacement(ray, level, level.matrixWorld, 0, 0, preview ? [preview] : [])
      for (let object = found?.surface; object; object = object.parent ?? undefined) {
        for (const [id, root] of sceneRegistry.nodes)
          if (object === root) {
            const raw = useScene.getState().nodes[id as AnyNodeId]
            if (raw && (String(raw.type) === HAND_SHOWER || !!showerSupplyHost(raw))) return id
            return null
          }
      }
      return null
    }
    const choose = (id: string | null) => {
      if (!id || useScene.getState().readOnly) return
      const nodes = useScene.getState().nodes,
        raw = nodes[id as AnyNodeId]
      if (raw && showerSupplyHost(raw)?.slots.some((s) => s.id === 'hose')) {
        setOutlet(id)
        return
      }
      if (outlet && String(raw?.type) === HAND_SHOWER) {
        try {
          const { placed, changes } = connectShowerHose(node, outlet, id, nodes, source?.id)
          useScene.getState().applyNodeChanges(changes)
          useViewer.getState().setSelection({ selectedIds: [placed.id] })
          triggerSFX('sfx:item-place')
          if (source) useEditor.getState().setMovingNode(null)
          setHover(null)
          setOutlet(null)
        } catch {
          setOutlet(null)
        }
      }
    }
    const click = (e: MouseEvent) => {
      if (e.button !== 0 || useViewer.getState().cameraDragging) return
      const r = canvas.getBoundingClientRect()
      raycaster.setFromCamera(
        new Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      )
      choose(hit(raycaster.ray))
    }
    const plan = (e: GridEvent) => {
      if (e.nativeEvent.target !== canvas) {
        const p = new Vector3(...e.position)
        choose(hit(new Ray(p.clone().add(new Vector3(0, 10000, 0)), new Vector3(0, -1, 0))))
      }
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (source) useEditor.getState().setMovingNode(null)
        else useEditor.getState().setTool(null)
      }
    }
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      raycaster.setFromCamera(
        new Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      )
      setHover(hit(raycaster.ray))
    }
    const planMove = (e: GridEvent) => {
      if (e.nativeEvent.target !== canvas) {
        const p = new Vector3(...e.position)
        setHover(hit(new Ray(p.clone().add(new Vector3(0, 10000, 0)), new Vector3(0, -1, 0))))
      }
    }
    canvas.addEventListener('pointermove', move)
    emitter.on('grid:move', planMove)
    canvas.addEventListener('click', click)
    emitter.on('grid:click', plan)
    window.addEventListener('keydown', key)
    return () => {
      canvas.removeEventListener('pointermove', move)
      emitter.off('grid:move', planMove)
      canvas.removeEventListener('click', click)
      emitter.off('grid:click', plan)
      window.removeEventListener('keydown', key)
    }
  }, [camera, gl, levelId, node, outlet, source, preview])
  const level = levelId ? sceneRegistry.nodes.get(levelId) : null
  return level && preview ? createPortal(<primitive object={preview} />, level) : null
}
