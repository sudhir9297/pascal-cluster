'use client'
import { useEffect, useState } from 'react'
import { Color, Group, Material, Mesh, MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { PlantNode } from '../domain/schema'
import { FAB_MODEL_URLS } from '../domain/models'

const models = new Map<string, Promise<Group>>()
function loadModel(url: string) {
  let pending = models.get(url)
  if (!pending) {
    pending = new GLTFLoader().loadAsync(url).then((gltf) => gltf.scene)
    models.set(url, pending)
    pending.catch(() => models.delete(url))
  }
  return pending
}

export default function FabModel({ node }: { node: PlantNode }) {
  const [model, setModel] = useState<Group | null>(null)
  const url = FAB_MODEL_URLS[node.preset]
  useEffect(() => {
    let cancelled = false
    let owned: Group | null = null
    setModel(null)
    if (url) loadModel(url).then((source) => {
      if (cancelled) return
      const instance = source.clone(true)
      instance.traverse((object) => {
        if (!(object instanceof Mesh)) return
        object.castShadow = true
        object.receiveShadow = true
        if (!node.tint) return
        const tint = new Color(node.tint)
        const original = Array.isArray(object.material) ? object.material : [object.material]
        const materials = original.map((material) => {
          const copy = material.clone()
          if (copy instanceof MeshStandardMaterial) copy.color.multiply(tint)
          return copy
        })
        object.material = Array.isArray(object.material) ? materials : materials[0]
      })
      owned = instance
      setModel(instance)
    }).catch((error) => console.error('Failed to load FABOTANIC plant', node.preset, error))
    return () => {
      cancelled = true
      owned?.traverse((object) => {
        if (!(object instanceof Mesh) || !node.tint) return
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material: Material) => material.dispose())
      })
    }
  }, [url, node.tint, node.preset])
  return model ? <primitive object={model} scale={node.scale} /> : null
}
