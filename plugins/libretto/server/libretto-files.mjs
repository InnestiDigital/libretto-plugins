#!/usr/bin/env node
// libretto-files: a local MCP server (stdio) that hands files on this computer to a core Libretto site: media files
// through the media.uploadFile door, font faces through the font.uploadFace door, a design system file through the
// design.import door.
//
// A door takes its file as base64 in `data`, inside an apply_ops batch of its own. Written by the model, a photo would
// cost hundreds of thousands of tokens; this server reads the file from disk and sends the same batch itself, so the
// conversation carries only the path and Libretto's answer.
//
// It talks to ${LIBRETTO_URL}/api/mcp with ${LIBRETTO_MCP_TOKEN} (both set by the plugin's .mcp.json) and needs
// nothing but Node 18 or later.
import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { createInterface } from 'node:readline'
import { setTimeout as sleep } from 'node:timers/promises'

const SERVER = { name: 'libretto-files', version: '1.0.0' }
const MiB = 1024 * 1024
/** The most of a file one door call carries, as the doors say: a larger file goes up through the admin. */
const MAX_CALL_BYTES = 20 * MiB
/** Where a person uploads what an agent may not send, in the admin's own words. */
const PERSON_PLACE = { media: 'Admin › Media', font: 'the editor\'s Design › Fonts', design: 'the editor\'s Design › Import and export' }
/** How many files one upload_media_files call takes: a call stays inside a client's tool timeout and the doors' rate. */
const MAX_FILES = 50
/** How many pages of the media library a bulk upload reads to skip files already there. */
const MAX_LIBRARY_PAGES = 50
/** How long to wait when the doors' upload limit (per token, per minute) is spent, before one more try. */
const RATE_WAIT_MS = 61_000
/** The media types media.uploadFile takes, by extension. */
const CONTENT_TYPES = new Map([
  ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.png', 'image/png'], ['.webp', 'image/webp'],
  ['.gif', 'image/gif'], ['.svg', 'image/svg+xml'], ['.pdf', 'application/pdf'],
  ['.mp4', 'video/mp4'], ['.webm', 'video/webm'],
])
/** The font containers font.uploadFace reads; Libretto stores each as WOFF2. */
const FONT_TYPES = new Map([['.woff2', 'font/woff2'], ['.woff', 'font/woff'], ['.ttf', 'font/ttf'], ['.otf', 'font/otf']])
const ARCHIVES = new Set(['.zip'])
/** The design system files design.import reads: a zip of JSON files, or one JSON file (Tokens Studio, DTCG, Figma variables). */
const DESIGN_FILES = new Set(['.zip', '.json'])
/** The tools of the remote server that take `siteId`; read_resources names the site in each URI instead. */
const TAKES_SITE = new Set(['site_context', 'apply_ops', 'dry_run_ops'])

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

const SITE_ID = { type: 'string', minLength: 1, description: 'The site to upload to, one of the ids libretto\'s site_context lists: needed with a token of several sites, left out with a one-site token.' }
const DRY_RUN = { type: 'boolean', description: 'Run every check the door makes (type, size, content, the site\'s space) and store nothing. A dry run counts toward the 60 uploads a minute.' }
const WORDS = { anyOf: [{ type: 'string', maxLength: 1000 }, { type: 'object', additionalProperties: { type: 'string', maxLength: 1000 } }] }
const COLOUR = { type: 'string', pattern: '^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$' }

const TOOLS = [
  {
    name: 'upload_media_file',
    description: 'Upload one file from this computer (an absolute path, a path starting with ~/, or relative to the working directory) into the core Libretto site\'s media library through the media.uploadFile door, without putting its bytes in the conversation. JPEG, PNG, GIF, WebP, SVG, MP4, WebM or PDF, at most 20 MB in one call; Libretto checks the file as Admin › Media does (type, size, content, the site\'s space) and says why when it refuses. A larger file or a ZIP archive goes up in Admin › Media, by a person. Give its alt text, caption and credit here (one string in the site\'s main language, or one per language); or, with `replaces` (a media id), the file becomes the new file of that entry, which keeps its words and folder, so every place that shows it follows. The upload is one step in History. The answer holds Libretto\'s answer: `id` (the media id: place it with tree.set_props `src: { "$media": "<id>" }`), `entryId` and `undo` (the call that takes the step back while it is the newest). For an SVG, `svgTextColor` names its colour that follows the text colour of the part drawing it, `svgAccentColor` the one that becomes its accent part.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', minLength: 1, description: 'The file to upload.' },
        folderId: { type: ['string', 'null'], description: 'A media folder id (the media resource lists the folders); null or absent for the top of the library. Not with replaces.' },
        alt: { ...WORDS, description: 'Its alt text: what the picture shows, for a visitor who cannot see it. Not with replaces.' },
        caption: { ...WORDS, description: 'Its caption. Not with replaces.' },
        credit: { type: 'string', maxLength: 512, description: 'Who made it. Not with replaces.' },
        replaces: { type: 'string', minLength: 1, description: 'A media id: this file becomes that entry\'s new file, of the same kind (a picture for a picture).' },
        svgTextColor: { ...COLOUR, description: 'SVG only: the file\'s colour that should follow the text colour of the part drawing it, such as "#1a1a1a" (currentColor already does).' },
        svgAccentColor: { ...COLOUR, description: 'SVG only: the colour of the file\'s one accent element, which becomes its accent part.' },
        dryRun: DRY_RUN,
        siteId: SITE_ID,
      },
      required: ['path'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    name: 'upload_media_files',
    description: `Upload many files from this computer into the core Libretto site's media library in one call: a list of \`paths\`, or the files of a \`directory\` whose name matches \`pattern\` (such as "*.jpg" or "*.{jpg,png,webp}"; \`recursive\` for its subfolders). At most ${MAX_FILES} files a call: for more, call again with the rest. A file whose name and size match one already in the library is skipped (\`skipExisting\`, true by default), so calling again after an interruption uploads only what is missing. Each file goes through the media.uploadFile door as its own step in History, checked as upload_media_file checks one; one refused file does not stop the others. The doors take 60 uploads a minute per token: past that the call waits a minute and goes on. A ZIP or a file over 20 MB is refused with where a person uploads it (Admin › Media). When a reference has the same picture in several widths (photo-480.jpg, photo-960.jpg, photo-1920.jpg), give only the largest: Libretto renders its own sizes. dryRun: true checks every file, the library and the site's space, sends one file as a dry run, and stores nothing. The answer counts the files and maps each uploaded file to its media id (\`uploaded\`), each skipped one to the id already in the library (\`skipped\`), and each refused one to the reason (\`refused\`).`,
    inputSchema: {
      type: 'object',
      properties: {
        paths: { type: 'array', items: { type: 'string', minLength: 1 }, maxItems: MAX_FILES, description: 'The files to upload (absolute, starting with ~/, or relative to the working directory).' },
        directory: { type: 'string', minLength: 1, description: 'A folder whose files to upload, instead of or with paths.' },
        pattern: { type: 'string', minLength: 1, description: 'Which file names of the directory: * and ? wildcards, {a,b} alternatives, case-insensitive. All the types the door takes when absent.' },
        recursive: { type: 'boolean', description: 'Also the files of the directory\'s subfolders.' },
        folderId: { type: ['string', 'null'], description: 'A media folder id (the media resource lists the folders; mediaFolder.create makes one); null or absent for the top of the library.' },
        skipExisting: { type: 'boolean', description: 'Skip a file whose name and size match one in the library; true when absent.' },
        dryRun: DRY_RUN,
        siteId: SITE_ID,
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    name: 'upload_font_file',
    description: 'Upload one font face from a WOFF2, WOFF, TTF or OTF file on this computer into the core Libretto site\'s fonts through the font.uploadFace door (an Administrator\'s), without putting its bytes in the conversation. One file is one face: give the family name, and its weight and style. A variable file draws a range of weights: give weight as [min, max] (for example [200, 800]), or leave weight out and Libretto reads the range from the file. Check the licence with the person first and record it in `licence`. Libretto stores the face as WOFF2; convert nothing yourself. At most 20 MB in one call; a face the library already holds is refused. The upload is one step in History; the answer holds Libretto\'s answer (`id`, the face\'s font id, and `undo`). Then point a fontFamily token at the family (token.set). A face\'s settings later: the font.setFace door; a Google Fonts family: the font.addGoogle door, through apply_ops.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', minLength: 1, description: 'The .woff2, .woff, .ttf or .otf file to upload.' },
        name: { type: 'string', minLength: 1, maxLength: 100, description: 'The family name, as tokens will name it (for example "Sul Sans").' },
        weight: {
          oneOf: [
            { type: 'integer', minimum: 1, maximum: 1000 },
            { type: 'array', items: { type: 'integer', minimum: 1, maximum: 1000 }, minItems: 2, maxItems: 2 },
          ],
          description: 'The face\'s weight, 400 for regular, 700 for bold; for a variable file its range, [200, 800]. Left out: the variable file\'s own range, or 400 for a static file.',
        },
        style: { type: 'string', enum: ['normal', 'italic'], description: 'normal when absent.' },
        display: { type: 'string', enum: ['swap', 'block', 'fallback', 'optional'], description: 'font-display; swap when absent.' },
        fallbackStack: { type: ['string', 'null'], maxLength: 255, description: 'The fonts used until it loads, for example "system-ui, sans-serif".' },
        fallback: { type: 'string', enum: ['arial', 'times', 'georgia', 'courier', 'menlo', 'none'], description: 'The system face its fallback is measured against, so the text does not jump when it loads.' },
        load: { type: 'string', enum: ['auto', 'critical', 'deferred'], description: 'How it loads; auto when absent.' },
        variation: { type: ['object', 'null'], additionalProperties: { type: 'number' }, description: 'Axes a variable file is pinned at, by their four-letter tag, such as { "wdth": 100 }.' },
        licence: { type: ['string', 'null'], maxLength: 2000, description: 'The licence the face is used under (the foundry\'s terms or the licence file\'s name).' },
        dryRun: DRY_RUN,
        siteId: SITE_ID,
      },
      required: ['path', 'name'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    name: 'import_design_file',
    description: 'Import a design system file from this computer into the core Libretto site through the design.import door, as Editor › Design (Import and export) takes one, without putting its bytes in the conversation: a zip of Tokens Studio\'s multi-file layout (or the zip design.export answers), one Tokens Studio file, one plain DTCG file or a Figma variables export, .zip or .json, at most 20 MB in one call. It is an Administrator\'s. Every call dry-runs the door first. With dryRun true it stops there and answers the plan: how many values the file adds (`added`), changes (`changed`), keeps (`same`) and skips (`skipped`), each value in `rows`, the sets it adds (`newSets`) and the themes it makes or changes (`themes`); tell the person and wait for their yes. Without dryRun it then applies the import as one step, unless the plan changes nothing (`changes: 0`, `applied: false`). Libretto\'s refusals come back in its own words (a design that moved since the dry run: `stale_revision`, dry-run again). The answer holds Libretto\'s answer: the `plan`, and applied, `entryId`, `revisions`, `corrections` and `undo`, the call that takes the whole import back while it is the newest step.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', minLength: 1, description: 'The design system file: a .zip or a .json (absolute, starting with ~/, or relative to the working directory).' },
        dryRun: { type: 'boolean', description: 'Only the dry run: the plan, nothing stored. Each call counts toward the 60 uploads a minute, its dry run too.' },
        siteId: SITE_ID,
      },
      required: ['path'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
]

const NEW_TOKEN = 'make a new token in the admin, in Account › Agents, set it with /plugin configure libretto@libretti and start a new session.'

function endpoint() {
  const base = (process.env.LIBRETTO_URL || 'https://librettocms.com').replace(/\/+$/, '')
  const token = process.env.LIBRETTO_MCP_TOKEN
  if (!token) throw new LibrettoError('No Libretto token: set it with /plugin configure libretto@libretti (Libretto site token) or in LIBRETTO_MCP_TOKEN, then restart Claude Code.')
  return { url: `${base}/api/mcp`, token }
}

/** A short JSON-RPC session with the remote Libretto MCP server; the calls that take `siteId` name it when one is given. */
async function remoteSession(siteId) {
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
    if (response.status === 401) throw new TokenRefusal(`Libretto refused the token (401): it is wrong, expired or revoked. To go on, ${NEW_TOKEN}`, text.slice(0, 500))
    if (response.status === 403) throw new TokenRefusal(`Libretto accepted the token, but the person who made it can no longer work on its sites (403). The workspace owner gives the access back first; then ${NEW_TOKEN}`, text.slice(0, 500))
    if (!response.ok) throw new LibrettoError(`Libretto answered ${response.status} at ${url}`, text.slice(0, 500))
    if (!text) return null
    const type = response.headers.get('content-type') ?? ''
    const body = type.includes('text/event-stream')
      ? text.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5)).join('')
      : text
    if (!body.trim().startsWith('{')) throw new LibrettoError(`Libretto answered something that is not JSON-RPC at ${url} (content-type ${type || 'none'})`, text.slice(0, 300))
    return JSON.parse(body)
  }
  const call = async (name, args) => {
    const params = { name, arguments: siteId !== undefined && TAKES_SITE.has(name) ? { siteId, ...args } : args }
    const answer = await send({ jsonrpc: '2.0', id: nextId++, method: 'tools/call', params })
    if (answer?.error) throw new LibrettoError(`Libretto refused ${name}: ${answer.error.message}`, answer.error)
    const result = answer?.result
    const value = parseText(result) ?? result?.structuredContent
    if (result?.isError) throw new LibrettoError(value?.message ?? `Libretto refused ${name}`, value)
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

/** The site the session works on, as site_context answers it: refused for a token of several sites without siteId, and for a site not on the core engine. */
async function coreSite(remote) {
  const context = await remote.call('site_context', {})
  if (Array.isArray(context?.sites)) {
    throw new LibrettoError(`This token reaches several sites: give siteId, one of ${context.sites.map(site => `${site.id} (${site.name})`).join(', ')}.`)
  }
  if (context?.engine !== 'core') {
    throw new LibrettoError('This site runs on Libretto\'s old engine. This plugin (1.0) works with core sites only: the Libretto plugin 0.5 serves the old engine.')
  }
  const resources = Array.isArray(context.resources) ? context.resources.map(each => (typeof each === 'string' ? each : each?.uri)).filter(Boolean) : []
  const uriOf = path => resources.find(uri => uri.endsWith(`/${path}`))
  return { context, mediaUri: uriOf('media'), spaceUri: uriOf('media-space') }
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

const mb = bytes => `${(bytes / MiB).toFixed(1)} MB`

/** A refusal for a file larger than one door call carries, saying where a person sends it; undefined when the call can carry it. */
function sizeRefusal(file, bytes, where) {
  return bytes > MAX_CALL_BYTES ? `${basename(file)} is ${mb(bytes)}: an agent sends at most ${mb(MAX_CALL_BYTES)} in one call. A person uploads it in ${PERSON_PLACE[where]}.` : undefined
}

/** A refusal for a file one door call cannot carry: an archive, or more than 20 MB. Undefined when the call can carry it. */
function callRefusal(file, bytes, where) {
  if (ARCHIVES.has(extname(file).toLowerCase())) {
    return where === 'media'
      ? `${basename(file)} is a ZIP archive: an agent uploads one file per call. Upload the archive in Admin › Media, which makes a folder of it, or unzip it and upload the folder's files.`
      : `${basename(file)} is a ZIP archive: upload each font file on its own, or the archive in ${PERSON_PLACE.font}.`
  }
  return sizeRefusal(file, bytes, where)
}

/** The content type media.uploadFile takes for `file` of `bytes`, or a refusal saying how to go on. */
function mediaTypeOf(file, bytes) {
  const refusal = callRefusal(file, bytes, 'media')
  if (refusal) throw new LibrettoError(refusal)
  const contentType = CONTENT_TYPES.get(extname(file).toLowerCase())
  if (!contentType) throw new LibrettoError(`Unknown file type ${extname(file) || '(none)'}: the media library takes ${[...CONTENT_TYPES.keys()].join(' ')}`)
  return contentType
}

/** One door alone in a batch, dry-run or applied; on the doors' upload limit, one more try after a minute. */
async function sendDoor(remote, name, input, dryRun, message) {
  const batch = () => ({ requestId: randomUUID(), baseRevisions: {}, ...(message ? { message } : {}), operations: [{ name, input }] })
  const tool = dryRun ? 'dry_run_ops' : 'apply_ops'
  try {
    return await remote.call(tool, batch())
  } catch (error) {
    if (!(error instanceof LibrettoError) || error.details?.code !== 'rate_limited') throw error
    await sleep(RATE_WAIT_MS)
    return remote.call(tool, batch())
  }
}

/** The `svgRoles` of media.uploadFile from the tool's colours; a refusal for colours on a file that is not an SVG. */
function svgRolesOf(contentType, svgTextColor, svgAccentColor) {
  if (svgTextColor === undefined && svgAccentColor === undefined) return {}
  if (contentType !== 'image/svg+xml') throw new LibrettoError('svgTextColor and svgAccentColor are for an SVG file only')
  return { svgRoles: { ...(svgTextColor === undefined ? {} : { text: svgTextColor }), ...(svgAccentColor === undefined ? {} : { accent: svgAccentColor }) } }
}

/** What the entry of a new file says of it; a refusal when it comes with `replaces`, whose entry keeps its own. */
function entryFieldsOf({ replaces, folderId, alt, caption, credit }) {
  const fields = { ...(folderId === undefined ? {} : { folderId }), ...(alt === undefined ? {} : { alt }), ...(caption === undefined ? {} : { caption }), ...(credit === undefined ? {} : { credit }) }
  if (replaces === undefined) return fields
  if (Object.keys(fields).length > 0) throw new LibrettoError('A replaced file keeps its entry\'s folder, alt text, caption and credit: send replaces alone, then change the words with media.setMeta.')
  return { replaces }
}

async function uploadMediaFile({ path, folderId, alt, caption, credit, replaces, svgTextColor, svgAccentColor, dryRun = false, siteId }) {
  const { file, bytes } = await localFile(path)
  const contentType = mediaTypeOf(file, bytes)
  const input = {
    filename: basename(file), contentType, data: (await readFile(file)).toString('base64'),
    ...entryFieldsOf({ replaces, folderId, alt, caption, credit }), ...svgRolesOf(contentType, svgTextColor, svgAccentColor),
  }
  const remote = await remoteSession(siteId)
  await coreSite(remote)
  const answer = await sendDoor(remote, 'media.uploadFile', input, dryRun, `${replaces === undefined ? 'Uploaded' : 'Replaced the file with'} ${basename(file)}`)
  return { dryRun, file, bytes, contentType, answer }
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

/** The value of the resource at uri, read through read_resources. */
async function readResource(remote, uri) {
  const answer = await remote.call('read_resources', { uris: [uri] })
  const value = answer?.resources?.[uri]
  if (value === undefined) throw new LibrettoError(`Libretto answered no ${uri}`, answer)
  return value
}

/**
 * Each library file's name and size, mapped to its media id, read from the media resource a page at a time (its
 * `bounded` entry for `items` names the URI that reads on); null when the library is longer than a bulk upload reads.
 */
async function libraryIndex(remote, mediaUri) {
  const index = new Map()
  let uri = mediaUri
  for (let page = 0; page < MAX_LIBRARY_PAGES && uri; page++) {
    const read = await readResource(remote, uri)
    for (const item of read.items ?? []) index.set(`${item.name}\u0000${item.size}`, item.id)
    uri = (read.bounded ?? []).find(cut => cut.list === 'items')?.next
  }
  return uri ? null : index
}

async function uploadMediaFiles({ paths = [], directory, pattern, recursive = false, folderId, skipExisting = true, dryRun = false, siteId }) {
  const base = directory === undefined ? null : absolutePath(directory)
  const takes = name => CONTENT_TYPES.has(extname(name).toLowerCase()) || ARCHIVES.has(extname(name).toLowerCase())
  const listed = base === null ? [] : await filesIn(base, pattern ? nameMatcher(pattern) : takes, recursive)
  const files = [...new Set([...paths.map(absolutePath), ...listed])]
  if (files.length === 0) throw new LibrettoError(base === null ? 'Give paths or a directory' : `No file in ${base} matches ${pattern ?? 'a type the media library takes'}`)
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

  const remote = await remoteSession(siteId)
  const { mediaUri, spaceUri } = await coreSite(remote)
  const library = skipExisting && mediaUri ? await libraryIndex(remote, mediaUri) : new Map()
  const skipped = {}
  const toUpload = []
  for (const entry of ready) {
    const existing = library?.get(`${basename(entry.file)}\u0000${entry.bytes}`)
    if (existing) skipped[nameOf(entry.file)] = existing
    else toUpload.push(entry)
  }
  const totalBytes = toUpload.reduce((sum, entry) => sum + entry.bytes, 0)
  const space = spaceUri ? await readResource(remote, spaceUri) : null
  if (typeof space?.quotaBytes === 'number' && typeof space?.usedBytes === 'number' && space.usedBytes + totalBytes > space.quotaBytes) {
    throw new LibrettoError(`These ${toUpload.length} files take ${mb(totalBytes)} and the media library has ${mb(Math.max(0, space.quotaBytes - space.usedBytes))} left: upload fewer, or free space in Admin › Media first.`)
  }

  const uploaded = {}
  for (const [position, entry] of toUpload.entries()) {
    if (dryRun && position > 0) break
    const input = { filename: basename(entry.file), contentType: entry.contentType, data: (await readFile(entry.file)).toString('base64'), ...(folderId === undefined ? {} : { folderId }) }
    try {
      const answer = await sendDoor(remote, 'media.uploadFile', input, dryRun, `Uploaded ${basename(entry.file)}`)
      uploaded[nameOf(entry.file)] = answer?.id ?? null
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
    ...(library === null ? { note: `The library is longer than ${MAX_LIBRARY_PAGES} reads: only its first files were checked for duplicates.` } : {}),
  }
}

async function uploadFontFile({ path, name, weight, style, display, fallbackStack, fallback, load, variation, licence, dryRun = false, siteId }) {
  const { file, bytes } = await localFile(path)
  const refusal = callRefusal(file, bytes, 'font')
  if (refusal) throw new LibrettoError(refusal)
  const contentType = FONT_TYPES.get(extname(file).toLowerCase())
  if (!contentType) throw new LibrettoError(`${basename(file)} is not a font file (.woff2, .woff, .ttf or .otf).`)
  const given = { weight, style, display, fallbackStack, fallback, load, variation, licence }
  const input = {
    fileName: basename(file), contentType, data: (await readFile(file)).toString('base64'), name,
    ...Object.fromEntries(Object.entries(given).filter(([, value]) => value !== undefined)),
  }
  const remote = await remoteSession(siteId)
  await coreSite(remote)
  const answer = await sendDoor(remote, 'font.uploadFace', input, dryRun, `Uploaded the font ${name}`)
  return { dryRun, file, bytes, answer }
}

/**
 * A design system file through the design.import door: a dry run first, which answers the plan; then, unless only the
 * dry run is asked or the plan changes nothing, the import applied as one step. Libretto's refusals as it words them.
 */
async function importDesignFile({ path, dryRun = false, siteId }) {
  const { file, bytes } = await localFile(path)
  if (!DESIGN_FILES.has(extname(file).toLowerCase())) {
    throw new LibrettoError(`${basename(file)} is not a design system file: design.import reads a .zip (Tokens Studio's multi-file layout, or the zip design.export answers) or one .json file (Tokens Studio, plain DTCG or a Figma variables export).`)
  }
  const refusal = sizeRefusal(file, bytes, 'design')
  if (refusal) throw new LibrettoError(refusal)
  const input = { fileName: basename(file), data: (await readFile(file)).toString('base64') }
  const remote = await remoteSession(siteId)
  await coreSite(remote)
  const message = `Imported the design system file ${basename(file)}`
  const planned = await sendDoor(remote, 'design.import', input, true, message)
  if (dryRun || planned?.changes === 0) return { dryRun, applied: false, file, bytes, answer: planned }
  const answer = await sendDoor(remote, 'design.import', input, false, message)
  return { dryRun, applied: answer?.changes !== 0, file, bytes, answer }
}

const TOOL_HANDLERS = { upload_media_file: uploadMediaFile, upload_media_files: uploadMediaFiles, upload_font_file: uploadFontFile, import_design_file: importDesignFile }

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
