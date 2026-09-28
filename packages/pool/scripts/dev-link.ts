import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const editorRoot = process.env.PASCAL_EDITOR_PATH
  ? path.resolve(process.env.PASCAL_EDITOR_PATH)
  : path.resolve(pluginRoot, '../../../editor')
const editorApp = path.join(editorRoot, 'apps/editor')
const appPlugin = path.join(editorApp, 'node_modules/@pascal-app/plugin-pool')

if (!existsSync(path.join(editorApp, 'package.json'))) {
  throw new Error('Editor checkout not found. Set PASCAL_EDITOR_PATH to its root directory.')
}
if (!existsSync(path.join(appPlugin, 'package.json'))) {
  throw new Error('Pool is not installed in the editor app. Install editor dependencies first.')
}

// A file: plugin is copied into the app's node_modules by Bun, including its
// own dependencies. Its hooks must use the same stores and R3F context as Canvas.
const sharedPackages = [
  '@pascal-app/core',
  '@pascal-app/editor',
  '@pascal-app/viewer',
  '@react-three/drei',
  '@react-three/fiber',
  '@types/react',
  'react',
  'three',
  'zustand',
] as const

function linkDependency(nodeModules: string, name: string) {
  const source = path.join(editorRoot, 'node_modules', name)
  const target = path.join(nodeModules, name)
  if (!existsSync(source)) throw new Error(`Editor dependency not found: ${source}`)
  const sourcePath = realpathSync(source)
  const installed = lstatSync(target, { throwIfNoEntry: false })
  if (installed && realpathSync(target) === sourcePath) return
  if (installed) {
    const metadata = JSON.parse(readFileSync(path.join(target, 'package.json'), 'utf8'))
    if (metadata.name !== name) throw new Error(`Refusing to replace an unexpected package at ${target}`)
    rmSync(target, { recursive: true })
  }
  mkdirSync(path.dirname(target), { recursive: true })
  symlinkSync(sourcePath, target, process.platform === 'win32' ? 'junction' : 'dir')
}

for (const nodeModules of [path.join(pluginRoot, 'node_modules'), path.join(appPlugin, 'node_modules')]) {
  for (const name of sharedPackages) linkDependency(nodeModules, name)
}

console.info('Pool development dependencies now share the editor runtime. Restart the editor dev server.')
