#!/usr/bin/env node
// libretto-files: a local MCP server (stdio) that hands files on this computer to Libretto.
//
// The remote Libretto MCP server takes an upload as base64 inside the tool call
// (media.upload). Written by the model, a photo would cost hundreds of thousands
// of tokens; this server reads the file from disk and sends the same media.upload
// batch itself, so the conversation carries only the path and the answer.
//
// It talks to ${LIBRETTO_URL}/api/mcp with ${LIBRETTO_MCP_TOKEN} (both set by the
// plugin's .mcp.json) and needs nothing but Node 18 or later.
import { readFile, stat } from 'node:fs/promises'
import { basename, extname, isAbsolute, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createInterface } from 'node:readline'

const SERVER = { name: 'libretto-files', version: '0.2.0' }
const MAX_BYTES = 5 * 1024 * 1024
const CONTENT_TYPES = new Map([
  ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.png', 'image/png'], ['.webp', 'image/webp'],
  ['.gif', 'image/gif'], ['.svg', 'image/svg+xml'], ['.pdf', 'application/pdf'],
  ['.mp4', 'video/mp4'], ['.webm', 'video/webm'],
])

/** A refusal this server or the Libretto server gave, with the words to show the user. */
class LibrettoError extends Error {
  constructor(message, details) {
    super(message)
    this.name = 'LibrettoError'
    this.details = details
  }
}

const TOOLS = [
  {
    name: 'upload_media_file',
    description: 'Upload a file from this computer (an absolute path, or relative to the working directory) into the Libretto site\'s media library through media.upload, without putting its bytes in the conversation. Images up to 5 MB (shrink larger ones first, for example `sips -Z 2400 in.jpg --out out.jpg` on macOS). dryRun: true runs every check and stores nothing. The answer holds the media record (`id`, `url`, kind, dimensions) and the `requestId` that history.undo takes. Then place the image with `{ "$media": "<id>" }` and set its alt text with media.update.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', minLength: 1, description: 'The file to upload.' },
        folderId: { type: ['string', 'null'], description: 'A media folder id (media.list answers folders); null or absent for the root.' },
        dryRun: { type: 'boolean', description: 'Check the upload without storing it.' },
      },
      required: ['path'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
]

function endpoint() {
  const base = (process.env.LIBRETTO_URL || 'https://librettocms.com').replace(/\/+$/, '')
  const token = process.env.LIBRETTO_MCP_TOKEN
  if (!token) throw new LibrettoError('No Libretto token: set it with /plugin (libretto, Libretto site token) or in LIBRETTO_MCP_TOKEN, then restart Claude Code.')
  return { url: `${base}/api/mcp`, token }
}

/** A short JSON-RPC session with the remote Libretto MCP server. */
async function remoteSession() {
  const { url, token } = endpoint()
  const headers = new Headers({
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    authorization: `Bearer ${token}`,
  })
  let nextId = 1
  const send = async (message) => {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(message), signal: AbortSignal.timeout(120_000) })
    const session = response.headers.get('mcp-session-id')
    if (session) headers.set('mcp-session-id', session)
    const text = await response.text()
    if (response.status === 401) throw new LibrettoError('Libretto refused the token (401): it is expired, revoked or wrong. Make a new one in the admin (Agenti e accessi MCP).')
    if (!response.ok) throw new LibrettoError(`Libretto answered ${response.status} at ${url}`, text.slice(0, 500))
    if (!text) return null
    const type = response.headers.get('content-type') ?? ''
    const json = type.includes('text/event-stream')
      ? text.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5)).join('')
      : text
    if (!json.trim().startsWith('{')) throw new LibrettoError(`Libretto answered something that is not JSON-RPC at ${url} (content-type ${type || 'none'})`, text.slice(0, 300))
    return JSON.parse(json)
  }
  const call = async (name, args) => {
    const answer = await send({ jsonrpc: '2.0', id: nextId++, method: 'tools/call', params: { name, arguments: args } })
    if (answer?.error) throw new LibrettoError(`Libretto refused ${name}: ${answer.error.message}`, answer.error)
    const result = answer?.result
    const value = result?.structuredContent ?? parseText(result)
    if (result?.isError) throw new LibrettoError(`Libretto refused ${name}`, value)
    return value
  }
  await send({ jsonrpc: '2.0', id: nextId++, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: SERVER } })
  await send({ jsonrpc: '2.0', method: 'notifications/initialized' })
  return { call }
}

function parseText(result) {
  const text = result?.content?.find(part => part.type === 'text')?.text
  if (text === undefined) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function uploadMediaFile({ path, folderId = null, dryRun = false }) {
  if (typeof path !== 'string' || !path) throw new LibrettoError('path is required')
  const file = isAbsolute(path) ? path : resolve(process.cwd(), path)
  const info = await stat(file).catch(() => null)
  if (!info?.isFile()) throw new LibrettoError(`No file at ${file}`)
  if (info.size > MAX_BYTES) throw new LibrettoError(`${basename(file)} is ${(info.size / 1048576).toFixed(1)} MB; Libretto takes images up to 5 MB. Shrink it first (macOS: sips -Z 2400 "${file}" --out smaller.jpg).`)
  const contentType = CONTENT_TYPES.get(extname(file).toLowerCase())
  if (!contentType) throw new LibrettoError(`Unknown file type ${extname(file) || '(none)'}; Libretto takes ${[...CONTENT_TYPES.keys()].join(' ')}`)
  const data = (await readFile(file)).toString('base64')
  const remote = await remoteSession()
  const context = await remote.call('site_context', {})
  const requestId = randomUUID()
  const batch = {
    format: 'splash.batch',
    v: 1,
    requestId,
    baseRevisions: { media: context.baseRevisions.media },
    operations: [{ name: 'media.upload', input: { filename: basename(file), contentType, data, folderId } }],
  }
  const answer = await remote.call(dryRun ? 'dry_run_ops' : 'apply_ops', batch)
  return { dryRun, requestId, file, bytes: info.size, contentType, answer }
}

const handlers = {
  initialize: params => ({
    protocolVersion: params?.protocolVersion ?? '2025-06-18',
    capabilities: { tools: {} },
    serverInfo: SERVER,
  }),
  ping: () => ({}),
  'tools/list': () => ({ tools: TOOLS }),
  'tools/call': async (params) => {
    if (params?.name !== 'upload_media_file') throw Object.assign(new Error(`Unknown tool ${params?.name}`), { code: -32602 })
    try {
      const value = await uploadMediaFile(params.arguments ?? {})
      return { content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value }
    } catch (error) {
      if (!(error instanceof LibrettoError)) throw error
      const value = { error: error.message, details: error.details ?? null }
      return { isError: true, content: [{ type: 'text', text: JSON.stringify(value) }] }
    }
  },
}

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

const lines = createInterface({ input: process.stdin })
lines.on('line', async (line) => {
  if (!line.trim()) return
  let message
  try {
    message = JSON.parse(line)
  } catch (error) {
    write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: `Parse error: ${error.message}` } })
    return
  }
  const handler = handlers[message.method]
  if (message.id === undefined) return
  if (!handler) {
    write({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Method not found: ${message.method}` } })
    return
  }
  try {
    write({ jsonrpc: '2.0', id: message.id, result: await handler(message.params) })
  } catch (error) {
    process.stderr.write(`[libretto-files] ${message.method} failed: ${error.stack ?? error}\n`)
    write({ jsonrpc: '2.0', id: message.id, error: { code: error.code ?? -32603, message: error.message } })
  }
})
