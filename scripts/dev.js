/**
 * Launcher mode dev: menjalankan API server + Vite dev server bersamaan.
 * Pakai: npm run dev
 */
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const require_ = createRequire(import.meta.url)

/**
 * Cari file biner paket secara robust lintas OS (Windows/macOS/Linux).
 * Tidak lagi hardcode 'node_modules/...' karena di Windows pemisah path
 * berbeda dan beberapa manajer paket (pnpm/bun/yarn PnP) menaruh paket di
 * lokasi lain. require.resolve selalu mengembalikan jalur absolut yang benar.
 */
function resolveBin(pkg, fallbackRelPath) {
  try {
    const pkgDir = path.dirname(require_.resolve(`${pkg}/package.json`))
    const manifest = require_(path.join(pkgDir, 'package.json'))
    let binRel = typeof manifest.bin === 'string'
      ? manifest.bin
      : manifest.bin && (manifest.bin[pkg.split('/').pop()] || Object.values(manifest.bin)[0])
    if (binRel) return path.join(pkgDir, binRel)
  } catch {
    /* fallback di bawah */
  }
  return path.join(ROOT, 'node_modules', fallbackRelPath)
}

const TSX_CLI = resolveBin('tsx', 'tsx/dist/cli.mjs')
const VITE_BIN = resolveBin('vite', 'vite/bin/vite.js')

const children = []

function pipeWithPrefix(stream, out, prefix) {
  let buffer = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    buffer += chunk
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) out.write(`${prefix}${line}\n`)
  })
  stream.on('end', () => {
    if (buffer) out.write(`${prefix}${buffer}\n`)
  })
}

let shuttingDown = false

function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (child.exitCode === null) child.kill()
  }
}

function launch(name, args) {
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  pipeWithPrefix(child.stdout, process.stdout, `[${name}] `)
  pipeWithPrefix(child.stderr, process.stderr, `[${name}] `)
  child.on('exit', () => shutdown())
  children.push(child)
}

process.on('SIGINT', () => {
  shutdown()
  process.exit(0)
})
process.on('SIGTERM', () => {
  shutdown()
  process.exit(0)
})

launch('api', [TSX_CLI, 'server/index.ts'])
launch('vite', [VITE_BIN])
