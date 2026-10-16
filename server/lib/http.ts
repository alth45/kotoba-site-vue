/** Utilitas HTTP bersama: error ber-status dan pengiriman respons JSON. */
import type { ServerResponse } from 'node:http'

/** Error dengan status code, supaya handler bisa mengembalikan 4xx alih-alih 500. */
export class HttpError extends Error {
  /** Status HTTP error ini. */
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'HttpError'
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}
