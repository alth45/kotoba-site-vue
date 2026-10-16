/** Endpoint peta kalimat: GET/PUT /api/map (data di data/map.json). */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { promises as fs } from 'node:fs'
import { MAP_FILE, EMPTY_MAP } from '../config'
import type { MapNodeDto, MapEdgeDto } from '../types'
import { sendJson } from '../lib/http'
import { readBody } from '../lib/body'
import { LOCK_MAP, withWriteLock, writeFileAtomic } from '../lib/writeLock'

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

function clampStr(v: unknown, max: number): string {
  return typeof v === 'string' ? v.slice(0, max) : ''
}

function sanitizeMap(raw: unknown): { nodes: MapNodeDto[]; edges: MapEdgeDto[] } {
  const rawObj = raw as { nodes?: unknown; edges?: unknown } | null | undefined
  const nodes: MapNodeDto[] = Array.isArray(rawObj?.nodes)
    ? rawObj.nodes.slice(0, 500).map((n: Record<string, unknown>) => ({
        id: clampStr(n.id, 64) || 'n',
        role: clampStr(n.role, 32),
        shape: clampStr(n.shape, 16),
        text: clampStr(n.text, 500),
        x: clampNum(n.x, -2000, 4000, 0),
        y: clampNum(n.y, -2000, 4000, 0),
        w: clampNum(n.w, 40, 600, 150),
        h: clampNum(n.h, 30, 600, 64),
      }))
    : []
  const edges: MapEdgeDto[] = Array.isArray(rawObj?.edges)
    ? rawObj.edges
        .slice(0, 1000)
        .map((e: Record<string, unknown>) => ({
          id: clampStr(e.id, 64) || 'e',
          from: clampStr(e.from, 64),
          to: clampStr(e.to, 64),
          label: clampStr(e.label, 100),
        }))
        .filter((e) => e.from && e.to)
    : []
  return { nodes, edges }
}

export async function handleMap(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
  if (url.pathname !== '/api/map') return false

  if (req.method === 'GET') {
    let raw = EMPTY_MAP
    try {
      raw = JSON.parse(await fs.readFile(MAP_FILE, 'utf8')) as typeof EMPTY_MAP
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
    sendJson(res, 200, sanitizeMap(raw))
    return true
  }

  if (req.method === 'PUT') {
    const body = await readBody(req)
    const map = sanitizeMap(body)
    // Seluruh file ditimpa — jalankan di antrean agar tidak membalap tulis lain.
    await withWriteLock(LOCK_MAP, () =>
      writeFileAtomic(MAP_FILE, JSON.stringify(map, null, 2) + '\n'),
    )
    sendJson(res, 200, { ok: true, nodes: map.nodes.length, edges: map.edges.length })
    return true
  }

  sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
  return true
}
