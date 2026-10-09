import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const editorRoot = process.env.PASCAL_EDITOR_PATH
  ? path.resolve(process.env.PASCAL_EDITOR_PATH)
  : path.resolve(pluginRoot, '../editor')
const appRoot = path.join(editorRoot, 'apps/editor')
if (!existsSync(path.join(appRoot, 'package.json'))) {
  throw new Error('Set PASCAL_EDITOR_PATH to the editor checkout root.')
}

const plugins = new Map([
  ['@pascal-app/plugin-bath-space', 'bath-space'],
  ['@pascal-app/plugin-landscape', 'landscape'],
  ['@pascal-app/plugin-pool', 'pool'],
  ['@pascal-app/plugin-streetscape', 'streetscape'],
  ['@webxr/plugin', 'webxr'],
])
const sharedPackages = [
  '@pascal-app/core',
  '@pascal-app/editor',
  '@pascal-app/viewer',
  '@pascal-app/nodes',
  '@react-three/drei',
  '@react-three/fiber',
  '@react-three/xr',
  '@types/react',
  '@types/react-dom',
  'react',
  'react-dom',
  'three',
  'zod',
  'zustand',
]

function link(target: string, source: string, expectedName: string | string[]) {
  const previous = lstatSync(target, { throwIfNoEntry: false })
  if (previous) {
    if (previous.isSymbolicLink() && realpathSync(target) === realpathSync(source)) return
    if (!previous.isSymbolicLink()) {
      const metadataPath = path.join(target, 'package.json')
      if (!existsSync(metadataPath)) throw new Error(`Refusing to replace ${target}`)
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf8')) as { name?: string }
      const expectedNames = Array.isArray(expectedName) ? expectedName : [expectedName]
      if (!expectedNames.includes(metadata.name ?? '')) {
        throw new Error(`Refusing to replace ${target} (${metadata.name})`)
      }
    }
    rmSync(target, { recursive: true })
  }
  mkdirSync(path.dirname(target), { recursive: true })
  symlinkSync(source, target, process.platform === 'win32' ? 'junction' : 'dir')
}

for (const [name, folder] of plugins) {
  const source = path.join(pluginRoot, 'packages', folder)
  const installedName =
    name === '@pascal-app/plugin-streetscape'
      ? ['@pascal-app/plugin-streetscape', '@pascal-app/plugin-streetscape-lab']
      : name
  if (name === '@pascal-app/plugin-pool') {
    const localPath = path.join(editorRoot, 'packages/plugin-pool')
    const existing = lstatSync(localPath, { throwIfNoEntry: false })
    if (existing && (!existing.isSymbolicLink() || realpathSync(localPath) !== realpathSync(source))) {
      throw new Error(`Refusing to replace the existing local pool path: ${localPath}`)
    }
    if (!existing) {
      mkdirSync(path.dirname(localPath), { recursive: true })
      symlinkSync(source, localPath, process.platform === 'win32' ? 'junction' : 'dir')
    }
  }
  for (const nodeModules of [path.join(editorRoot, 'node_modules'), path.join(appRoot, 'node_modules')]) {
    link(path.join(nodeModules, name), source, installedName)
  }
}

for (const folder of plugins.values()) {
  const packageNodeModules = path.join(pluginRoot, 'packages', folder, 'node_modules')
  for (const name of sharedPackages) {
    const source = path.join(editorRoot, 'node_modules', name)
    if (!existsSync(source)) throw new Error(`Editor dependency not found: ${source}`)
    link(path.join(packageNodeModules, name), realpathSync(source), name)
  }
}

console.info(`Linked ${plugins.size} local plugins from ${pluginRoot} into ${editorRoot}. Restart the editor dev server.`)
