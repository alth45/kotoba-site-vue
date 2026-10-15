/**
 * Launcher mode dev: menjalankan API server + Vite dev server bersamaan.
 * Pakai: npm run dev
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
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

launch('api', ['node_modules/tsx/dist/cli.mjs', 'server/index.ts'])
launch('vite', ['node_modules/vite/bin/vite.js'])
