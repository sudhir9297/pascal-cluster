import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const editorRoot = process.env.PASCAL_EDITOR_PATH
  ? path.resolve(process.env.PASCAL_EDITOR_PATH)
  : path.resolve(pluginRoot, '../../../editor')
const editorApp = path.join(editorRoot, 'apps/editor')
const linkOnly = process.argv.includes('--link-only')
const unlink = process.argv.includes('--unlink')

if (!existsSync(path.join(editorApp, 'package.json'))) {
  throw new Error('Editor checkout not found. Set PASCAL_EDITOR_PATH to its root directory.')
}

function run(args: string[], cwd: string) {
  const result = Bun.spawnSync([process.execPath, ...args], {
    cwd,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (result.exitCode !== 0) process.exit(result.exitCode)
}

const packagePath = path.join(editorRoot, 'node_modules/@pascal-app/plugin-landscape')
if (unlink) {
  if (lstatSync(packagePath, { throwIfNoEntry: false })?.isSymbolicLink()) {
    if (realpathSync(packagePath) !== realpathSync(pluginRoot)) {
      throw new Error(`The package is linked to another checkout: ${packagePath}`)
    }
    unlinkSync(packagePath)
  }
  run(['install', '--frozen-lockfile'], editorRoot)
  console.info('Published Landscape dependency restored. Restart the editor to use it.')
  process.exit(0)
}

mkdirSync(path.dirname(packagePath), { recursive: true })
// Only node_modules changes; the editor keeps its published dependency and lockfile.
const installed = lstatSync(packagePath, { throwIfNoEntry: false })
if (installed?.isSymbolicLink()) {
  unlinkSync(packagePath)
} else if (installed) {
  const metadata = JSON.parse(readFileSync(path.join(packagePath, 'package.json'), 'utf8'))
  if (metadata.name !== '@pascal-app/plugin-landscape') {
    throw new Error(`Refusing to replace an unexpected package at ${packagePath}`)
  }
  rmSync(packagePath, { recursive: true })
}
symlinkSync(pluginRoot, packagePath, process.platform === 'win32' ? 'junction' : 'dir')
console.info(`Landscape linked: ${packagePath} → ${pluginRoot}`)

if (!linkOnly) {
  run(['run', 'build'], path.join(editorRoot, 'packages/nodes'))
  const server = Bun.spawn([process.execPath, 'run', 'dev'], {
    cwd: editorApp,
    env: { ...process.env, PORT: process.env.PORT ?? '3004' },
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => server.kill(signal))
  }
  process.exit(await server.exited)
}
