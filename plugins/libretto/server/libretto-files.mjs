#!/usr/bin/env node
// libretto-files: a local MCP server (stdio) that hands files on this computer to Libretto:
// images and other media through media.upload, font faces through font.upload.
//
// The remote Libretto MCP server takes an upload as base64 inside the tool call
// (media.upload). Written by the model, a photo would cost hundreds of thousands
// of tokens; this server reads the file from disk and sends the same media.upload
// batch itself, so the conversation carries only the path and the answer.
//
// It talks to ${LIBRETTO_URL}/api/mcp with ${LIBRETTO_MCP_TOKEN} (both set by the
// plugin's .mcp.json) and needs nothing but Node 18 or later.
import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { createInterface } from 'node:readline'

const SERVER = { name: 'libretto-files', version: '0.3.0' }
const MAX_BYTES = 5 * 1024 * 1024
/** How many files one upload_media_files call takes: a call stays well inside a client's tool timeout, and the next call skips what is already up. */
const MAX_FILES = 100
/** How many pages of the media library a bulk upload reads to skip files already there (100 rows a page). */
const MAX_LIBRARY_PAGES = 50
/** font.upload's `data` holds at most 16 MiB of base64 characters; the server's FONT_MAX_FILE_MB may be lower. */
const MAX_FONT_BASE64 = 16 * 1024 * 1024
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

/** Libretto refused the token itself (401, 403): every later call would be refused too. */
class TokenRefusal extends LibrettoError {
  constructor(message, details) {
    super(message, details)
    this.name = 'TokenRefusal'
  }
}

const TOOLS = [
  {
    name: 'upload_media_file',
    description: 'Upload a file from this computer (an absolute path, a path starting with ~/, or relative to the working directory) into the Libretto site\'s media library through media.upload, without putting its bytes in the conversation. Images up to 5 MB (shrink larger ones first, for example `sips -Z 2400 in.jpg --out out.jpg` on macOS). dryRun: true runs every check and stores nothing. The answer holds the media record (`id`, `url`, kind, dimensions) and the `requestId` that history.undo takes. Then place the image with `{ "$media": "<id>" }` and set its alt text with media.update.',
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
  {
    name: 'upload_media_files',
    description: 'Upload many files from this computer into the Libretto site\'s media library in one call: a list of `paths`, or the files of a `directory` whose name matches `pattern` (such as "*.jpg" or "*.{jpg,png,webp}"; `recursive` for its subfolders). At most ' + MAX_FILES + ' files a call: for more, call again with the rest. A file whose name and size match one already in the library is skipped (`skipExisting`, true by default), so calling again after an interruption uploads only what is missing. Each file is checked like upload_media_file (images up to 5 MB, known types) and uploaded as its own undoable change; one refused file does not stop the others. When a reference has the same picture in several widths (photo-480.jpg, photo-960.jpg, photo-1920.jpg), give only the largest: Libretto renders its own sizes. dryRun: true checks every file, the library and the quota, sends one file as a dry run, and stores nothing. The answer counts the files and maps each uploaded file to its media id (`uploaded`), each skipped one to the id already in the library (`skipped`), and each refused one to the reason (`refused`).',
    inputSchema: {
      type: 'object',
      properties: {
        paths: { type: 'array', items: { type: 'string', minLength: 1 }, maxItems: MAX_FILES, description: 'The files to upload (absolute, starting with ~/, or relative to the working directory).' },
        directory: { type: 'string', minLength: 1, description: 'A folder whose files to upload, instead of or with paths.' },
        pattern: { type: 'string', minLength: 1, description: 'Which file names of the directory: * and ? wildcards, {a,b} alternatives, case-insensitive. All the known types when absent.' },
        recursive: { type: 'boolean', description: 'Also the files of the directory\'s subfolders.' },
        folderId: { type: ['string', 'null'], description: 'A media folder id (media.list answers folders); null or absent for the root.' },
        skipExisting: { type: 'boolean', description: 'Skip a file whose name and size match one in the library; true when absent.' },
        dryRun: { type: 'boolean', description: 'Check everything without storing anything.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    name: 'upload_font_file',
    description: 'Upload a font face from a WOFF2 file on this computer into the Libretto site\'s font library through font.upload, without putting its bytes in the conversation. One file is one face: give the family name, weight and style. Check the licence first and record it in `licence` (the foundry\'s terms or the licence file\'s name): the library shows it with the face. WOFF, TTF and OTF are refused: convert to WOFF2 first, if the licence allows it. A face the library already holds is refused (409 font_face_exists) unless replace is true. dryRun: true runs every check and stores nothing. Then point a font-family token at the family (designSystem.setToken, type fontFamily). Needs a Libretto with font.upload: an older one answers unknown_operation.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', minLength: 1, description: 'The .woff2 file to upload.' },
        name: { type: 'string', minLength: 1, maxLength: 100, description: 'The family name, as tokens will name it (for example "Sul Sans").' },
        weight: { type: 'integer', minimum: 1, maximum: 1000, description: 'The face\'s weight, 400 for regular, 700 for bold.' },
        style: { type: 'string', enum: ['normal', 'italic'] },
        display: { type: 'string', enum: ['swap', 'block', 'fallback', 'optional'], description: 'font-display; swap when absent.' },
        fallbackStack: { type: ['string', 'null'], maxLength: 255, description: 'The fonts used until it loads, for example "system-ui, sans-serif".' },
        licence: { type: ['string', 'null'], minLength: 1, maxLength: 2000, description: 'The licence the face is used under.' },
        replace: { type: 'boolean', description: 'Replace a face the library already holds with this name, weight and style.' },
        dryRun: { type: 'boolean', description: 'Check the upload without storing it.' },
      },
      required: ['path', 'name', 'weight', 'style'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
]

function endpoint() {
  const base = (process.env.LIBRETTO_URL || 'https://librettocms.com').replace(/\/+$/, '')
  const token = process.env.LIBRETTO_MCP_TOKEN
  if (!token) throw new LibrettoError('No Libretto token: set it with /plugin configure libretto@libretti (Token del sito Libretto) or in LIBRETTO_MCP_TOKEN, then restart Claude Code.')
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
    if (response.status === 401) throw new TokenRefusal('Libretto refused the token (401): it is wrong, expired, revoked, or made before the Libretto was reset. Make a new one in the admin (Persone e accessi > Agenti e accessi MCP), set it with /plugin configure libretto@libretti and start a new session.', text.slice(0, 500))
    if (response.status === 403) throw new TokenRefusal('Libretto accepted the token, but the person who made it can no longer work on this site (403: site or workspace access, role or password). The workspace owner restores the access first; then make a new token in the admin (Persone e accessi > Agenti e accessi MCP), set it with /plugin configure libretto@libretti and start a new session.', text.slice(0, 500))
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
    // Libretto answers tools as JSON text; older servers also sent structuredContent.
    const value = parseText(result) ?? result?.structuredContent
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

/** `~` and `~/...` start at the home directory, as in a shell; any other relative path is under the working directory. */
function absolutePath(path) {
  if (path === '~' || path.startsWith('~/') || path.startsWith(`~${sep}`)) return join(homedir(), path.slice(1))
  return isAbsolute(path) ? path : resolve(process.cwd(), path)
}

/** The absolute path and size of the file at `path`, or a refusal naming it. */
async function localFile(path) {
  if (typeof path !== 'string' || !path) throw new LibrettoError('path is required')
  const file = absolutePath(path)
  const info = await stat(file).catch(() => null)
  if (!info?.isFile()) throw new LibrettoError(`No file at ${file}`)
  return { file, bytes: info.size }
}

/** One operation alone in a batch on `remote`, at `revision` of the document it writes, dry-run or applied. */
async function sendBatch(remote, name, input, revisionKey, revision, dryRun) {
  const requestId = randomUUID()
  const batch = {
    format: 'libretto.batch',
    v: 1,
    requestId,
    baseRevisions: { [revisionKey]: revision },
    operations: [{ name, input }],
  }
  const answer = await remote.call(dryRun ? 'dry_run_ops' : 'apply_ops', batch)
  return { requestId, answer }
}

/** One operation alone in a batch, on the current revision of the document it writes, dry-run or applied. */
async function sendOperation(name, input, revisionKey, dryRun) {
  const remote = await remoteSession()
  const context = await remote.call('site_context', {})
  return sendBatch(remote, name, input, revisionKey, context.baseRevisions[revisionKey], dryRun)
}

/** The content type media.upload takes for `file` of `bytes`, or a refusal saying how to fix it. */
function mediaTypeOf(file, bytes) {
  if (bytes > MAX_BYTES) throw new LibrettoError(`${basename(file)} is ${(bytes / 1048576).toFixed(1)} MB; Libretto takes images up to 5 MB. Shrink it first (macOS: sips -Z 2400 "${file}" --out smaller.jpg).`)
  const contentType = CONTENT_TYPES.get(extname(file).toLowerCase())
  if (!contentType) throw new LibrettoError(`Unknown file type ${extname(file) || '(none)'}; Libretto takes ${[...CONTENT_TYPES.keys()].join(' ')}`)
  return contentType
}

async function uploadMediaFile({ path, folderId = null, dryRun = false }) {
  const { file, bytes } = await localFile(path)
  const contentType = mediaTypeOf(file, bytes)
  const data = (await readFile(file)).toString('base64')
  const { requestId, answer } = await sendOperation('media.upload', { filename: basename(file), contentType, data, folderId }, 'media', dryRun)
  return { dryRun, requestId, file, bytes, contentType, answer }
}

/** A case-insensitive test of a file name against `pattern`: `*`, `?` and `{a,b}`. */
function nameMatcher(pattern) {
  const source = pattern.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '.')
    .replace(/\{([^}]*)\}/g, (_, options) => `(?:${options.split(',').join('|')})`)
  const expression = new RegExp(`^${source}$`, 'i')
  return name => expression.test(name)
}

/** The files of `directory` (and its subfolders when `recursive`) whose name `matches`, hidden files left out. */
async function filesIn(directory, matches, recursive) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => null)
  if (!entries) throw new LibrettoError(`No folder at ${directory}`)
  const files = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory() && recursive) files.push(...await filesIn(path, matches, recursive))
    else if (entry.isFile() && matches(entry.name)) files.push(path)
  }
  return files
}

/** Each library file's name and size, mapped to its media id; null when the library is larger than a bulk upload reads. */
async function libraryIndex(remote, revision) {
  const index = new Map()
  let quota = null
  for (let page = 1; page <= MAX_LIBRARY_PAGES; page++) {
    const { answer } = await sendBatch(remote, 'media.list', { page, perPage: 100 }, 'media', revision, true)
    const list = answer?.results?.[0]?.output
    if (!list) throw new LibrettoError('Libretto answered media.list without a list', answer)
    quota ??= { usedBytes: list.usedBytes, quotaBytes: list.quotaBytes }
    for (const item of list.items) index.set(`${item.filename}\u0000${item.size}`, item.id)
    if (page * list.perPage >= list.total) return { index, quota }
  }
  return { index: null, quota }
}

async function uploadMediaFiles({ paths = [], directory, pattern, recursive = false, folderId = null, skipExisting = true, dryRun = false }) {
  const base = directory === undefined ? null : absolutePath(directory)
  const listed = base === null ? [] : await filesIn(base, pattern ? nameMatcher(pattern) : name => CONTENT_TYPES.has(extname(name).toLowerCase()), recursive)
  const files = [...new Set([...paths.map(absolutePath), ...listed])]
  if (files.length === 0) throw new LibrettoError(base === null ? 'Give paths or a directory' : `No file in ${base} matches ${pattern ?? 'a known type'}`)
  if (files.length > MAX_FILES) throw new LibrettoError(`${files.length} files: at most ${MAX_FILES} a call. Give the first ${MAX_FILES} (a narrower pattern or a list of paths), then call again with the rest.`)
  const nameOf = file => (base !== null && file.startsWith(base + sep) ? relative(base, file) : file)

  const refused = {}
  const ready = []
  for (const file of files) {
    try {
      const { bytes } = await localFile(file)
      ready.push({ file, bytes, contentType: mediaTypeOf(file, bytes) })
    } catch (error) {
      if (!(error instanceof LibrettoError)) throw error
      refused[nameOf(file)] = error.message
    }
  }

  const remote = await remoteSession()
  let revision = (await remote.call('site_context', {})).baseRevisions.media
  const skipped = {}
  const library = await libraryIndex(remote, revision)
  const toUpload = []
  for (const entry of ready) {
    const existing = skipExisting ? library.index?.get(`${basename(entry.file)}\u0000${entry.bytes}`) : undefined
    if (existing) skipped[nameOf(entry.file)] = existing
    else toUpload.push(entry)
  }
  const totalBytes = toUpload.reduce((sum, entry) => sum + entry.bytes, 0)
  const { usedBytes, quotaBytes } = library.quota ?? {}
  if (typeof quotaBytes === 'number' && typeof usedBytes === 'number' && usedBytes + totalBytes > quotaBytes) {
    throw new LibrettoError(`These ${toUpload.length} files take ${(totalBytes / 1048576).toFixed(1)} MB and the media library has ${((quotaBytes - usedBytes) / 1048576).toFixed(1)} MB left: upload fewer, or free space in the admin (Media) first.`)
  }

  const uploaded = {}
  for (const [position, entry] of toUpload.entries()) {
    if (dryRun && position > 0) break
    const input = { filename: basename(entry.file), contentType: entry.contentType, data: (await readFile(entry.file)).toString('base64'), folderId }
    try {
      let result
      try {
        result = await sendBatch(remote, 'media.upload', input, 'media', revision, dryRun)
      } catch (error) {
        // Someone else changed the library meanwhile: take its revision and try once more.
        if (!(error instanceof LibrettoError) || error.details?.status !== 409) throw error
        revision = (await remote.call('site_context', {})).baseRevisions.media
        result = await sendBatch(remote, 'media.upload', input, 'media', revision, dryRun)
      }
      if (!dryRun) revision = result.answer?.revisions?.media ?? revision
      uploaded[nameOf(entry.file)] = result.answer?.results?.[0]?.output?.id ?? null
    } catch (error) {
      if (error instanceof TokenRefusal || !(error instanceof LibrettoError)) throw error
      refused[nameOf(entry.file)] = error.details?.message ?? error.message
    }
  }

  return {
    dryRun,
    counts: { files: files.length, uploaded: dryRun ? 0 : Object.keys(uploaded).length, toUpload: toUpload.length, skipped: Object.keys(skipped).length, refused: Object.keys(refused).length },
    ...(dryRun ? { checkedOnServer: Object.keys(uploaded) } : { uploaded }),
    skipped,
    refused,
    ...(library.index === null ? { note: `The library has more than ${MAX_LIBRARY_PAGES * 100} files: only the first ${MAX_LIBRARY_PAGES * 100} were checked for duplicates.` } : {}),
  }
}

async function uploadFontFile({ path, name, weight, style, display, fallbackStack, licence, replace, dryRun = false }) {
  const { file, bytes } = await localFile(path)
  if (extname(file).toLowerCase() !== '.woff2') throw new LibrettoError(`${basename(file)} is not a .woff2 file; Libretto takes WOFF2 faces only. Convert it first, if its licence allows it.`)
  const data = (await readFile(file)).toString('base64')
  if (data.length > MAX_FONT_BASE64) throw new LibrettoError(`${basename(file)} is ${(bytes / 1048576).toFixed(1)} MB, more than font.upload carries.`)
  const input = {
    fileName: basename(file), name, weight, style, data,
    ...(display === undefined ? {} : { display }),
    ...(fallbackStack === undefined ? {} : { fallbackStack }),
    ...(licence === undefined ? {} : { licence }),
    ...(replace === undefined ? {} : { replace }),
  }
  const { requestId, answer } = await sendOperation('font.upload', input, 'fonts', dryRun)
  return { dryRun, requestId, file, bytes, answer }
}

const TOOL_HANDLERS = { upload_media_file: uploadMediaFile, upload_media_files: uploadMediaFiles, upload_font_file: uploadFontFile }

const handlers = {
  initialize: params => ({
    protocolVersion: params?.protocolVersion ?? '2025-06-18',
    capabilities: { tools: {} },
    serverInfo: SERVER,
  }),
  ping: () => ({}),
  'tools/list': () => ({ tools: TOOLS }),
  'tools/call': async (params) => {
    const handler = Object.hasOwn(TOOL_HANDLERS, params?.name) ? TOOL_HANDLERS[params.name] : null
    if (!handler) throw Object.assign(new Error(`Unknown tool ${params?.name}`), { code: -32602 })
    try {
      const value = await handler(params.arguments ?? {})
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
