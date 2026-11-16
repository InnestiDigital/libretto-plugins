#!/usr/bin/env node
// Checks the plugin's libretto-files server without a real Libretto:
//   - how it is started: the launcher finds Node where an app's minimal PATH does not;
//   - how it resolves the paths it is given (every case stops in the local file checks);
//   - the three upload tools against a small fake core Libretto MCP endpoint (site_context, read_resources,
//     the media.uploadFile and font.uploadFace doors).
//
//   node scripts/test-libretto-files.mjs
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'plugins', 'libretto', 'server')
const server = join(serverDir, 'libretto-files.mjs')
const launcher = join(serverDir, 'run-node.sh')
/** What an app opened from the Dock or Finder gets on macOS. */
const GUI_PATH = '/usr/bin:/bin:/usr/sbin:/sbin'
const temporary = []
const makeDir = (name) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), `libretto-files-${name}-`)))
  temporary.push(dir)
  return dir
}
const INITIALIZE = `${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } } })}\n`

/** Starts the server with `command` and `args` the way an MCP client does, and answers each tool call's parsed text. */
function start(command, args, { cwd, env }) {
  const child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'inherit'] })
  const pending = new Map()
  createInterface({ input: child.stdout }).on('line', (line) => {
    const message = JSON.parse(line)
    pending.get(message.id)?.(message)
    pending.delete(message.id)
  })
  let nextId = 1
  const request = (method, params) => {
    const id = nextId++
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
    return new Promise(resolve => pending.set(id, resolve))
  }
  const call = (name, args) => request('tools/call', { name, arguments: args }).then(message => JSON.parse(message.result.content[0].text))
  return { request, call, stop: () => child.kill() }
}

/** How a GUI app runs a command: no login shell, only `env`. */
function runLikeAnApp(script, env) {
  return spawnSync('/bin/sh', ['-c', script], { env, input: INITIALIZE, encoding: 'utf8', timeout: 20_000 })
}

let failures = 0
async function check(what, body) {
  try {
    await body()
    console.log(`ok    ${what}`)
  } catch (error) {
    failures++
    console.log(`FAIL  ${what}\n      ${error.message.split('\n').join('\n      ')}`)
  }
}
const skip = (what, why) => console.log(`skip  ${what}: ${why}`)

try {
  // --- Starting the server ------------------------------------------------------------
  const appHome = makeDir('app-home')
  const nodeOnGuiPath = GUI_PATH.split(':').some(dir => existsSync(join(dir, 'node')))
  const fixedNodes = ['/opt/homebrew/bin/node', '/usr/local/bin/node'].filter(existsSync)

  if (nodeOnGuiPath) skip('the old command fails on an app\'s PATH', 'this machine has node in /usr/bin or /bin')
  else {
    await check('the old command ("command": "node") fails on an app\'s PATH', () => {
      const run = runLikeAnApp(`node "${server}"`, { HOME: appHome, PATH: GUI_PATH })
      assert.equal(run.status, 127, `exit ${run.status}, stderr ${run.stderr}`)
      assert.match(run.stderr, /node: (command )?not found/)
    })
  }

  // A home with only an nvm install, as many developers have it.
  const nvmBin = join(appHome, '.nvm', 'versions', 'node', 'v99.0.0', 'bin')
  mkdirSync(nvmBin, { recursive: true })
  symlinkSync(process.execPath, join(nvmBin, 'node'))
  await check('the launcher starts the server on an app\'s PATH', () => {
    const run = runLikeAnApp(`sh "${launcher}" "${server}"`, { HOME: appHome, PATH: GUI_PATH })
    assert.equal(run.status, 0, `exit ${run.status}, stderr ${run.stderr}`)
    assert.match(run.stdout, /"serverInfo":\{"name":"libretto-files"/)
  })
  await check('the launcher takes LIBRETTO_NODE first', () => {
    const run = runLikeAnApp(`sh "${launcher}" -p process.execPath`, { HOME: makeDir('empty-home'), PATH: GUI_PATH, LIBRETTO_NODE: process.execPath })
    assert.equal(run.status, 0, run.stderr)
    assert.equal(realpathSync(run.stdout.trim()), realpathSync(process.execPath))
  })
  await check('the launcher run by node starts the server (the Windows path, LIBRETTO_NODE as the command)', () => {
    const run = spawnSync(process.execPath, [launcher, server], { input: INITIALIZE, encoding: 'utf8', timeout: 20_000 })
    assert.equal(run.status, 0, run.stderr)
    assert.match(run.stdout, /"serverInfo":\{"name":"libretto-files"/)
  })
  if (nodeOnGuiPath || fixedNodes.length > 0) skip('without any Node the launcher says what to install', `this machine has node at ${[...fixedNodes, ...(nodeOnGuiPath ? ['the app PATH'] : [])].join(', ')}`)
  else {
    await check('without any Node the launcher says what to install', () => {
      const run = runLikeAnApp(`sh "${launcher}" "${server}"`, { HOME: makeDir('no-node-home'), PATH: GUI_PATH })
      assert.equal(run.status, 127)
      assert.equal(run.stderr.trim().split('\n').length, 1)
      assert.match(run.stderr, /Node\.js 18 .*https:\/\/nodejs\.org.*LIBRETTO_NODE/)
    })
  }

  // --- Paths ----------------------------------------------------------------------------
  const home = makeDir('home')
  const work = makeDir('work')
  mkdirSync(join(home, 'Immagini'))
  writeFileSync(join(home, 'Immagini', 'foto.txt'), 'not a font')
  writeFileSync(join(work, 'foto.txt'), 'not a font')
  // os.homedir() reads HOME (USERPROFILE on Windows).
  const local = start(process.execPath, [server], { cwd: work, env: { ...process.env, HOME: home, USERPROFILE: home, LIBRETTO_URL: 'http://127.0.0.1:9', LIBRETTO_MCP_TOKEN: 'unused' } })
  const pathCases = [
    ['~/ is the home directory', 'upload_font_file', '~/Immagini/foto.txt', 'foto.txt is not a font file'],
    ['~/ is the home directory (media)', 'upload_media_file', '~/Immagini/foto.txt', 'Unknown file type .txt'],
    ['~ alone is the home directory', 'upload_media_file', '~', `No file at ${home}`],
    ['a missing file under ~ names the expanded path', 'upload_media_file', '~/Immagini/manca.jpg', `No file at ${join(home, 'Immagini', 'manca.jpg')}`],
    ['a relative path is under the working directory', 'upload_font_file', 'foto.txt', 'foto.txt is not a font file'],
    ['~name is not expanded', 'upload_media_file', '~altro/foto.jpg', `No file at ${join(work, '~altro', 'foto.jpg')}`],
    ['an absolute path stays as it is', 'upload_font_file', join(work, 'foto.txt'), 'foto.txt is not a font file'],
  ]
  for (const [what, tool, path, expected] of pathCases) {
    await check(what, async () => {
      const { error } = await local.call(tool, { path, name: 'Test', weight: 400, style: 'normal', dryRun: true })
      assert.ok(error?.startsWith(expected), `${path} answered ${JSON.stringify(error)}, expected it to start with ${JSON.stringify(expected)}`)
    })
  }
  local.stop()

  // --- The uploads against a fake core Libretto ------------------------------------------
  const MiB = 1024 * 1024
  const photos = makeDir('photos')
  const existing = Buffer.from('already there')
  writeFileSync(join(photos, 'gia.jpg'), existing)
  writeFileSync(join(photos, 'a.jpg'), 'a')
  writeFileSync(join(photos, 'b.png'), 'b')
  writeFileSync(join(photos, 'rifiuta.jpg'), 'refused by the fake server')
  writeFileSync(join(photos, 'grande.jpg'), Buffer.alloc(20 * MiB + 1))
  writeFileSync(join(photos, 'archivio.zip'), 'PK\u0003\u0004')
  writeFileSync(join(photos, 'note.txt'), 'not media')
  writeFileSync(join(photos, '.nascosta.jpg'), 'hidden')
  mkdirSync(join(photos, 'sotto'))
  writeFileSync(join(photos, 'sotto', 'c.jpg'), 'c')

  const drawings = makeDir('drawings')
  writeFileSync(join(drawings, 'glifo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24" stroke="#3ccb7f"/></svg>')

  const SITE = 'libretto://site/s1'
  const MEDIA = `${SITE}/media`
  const MEDIA_PAGE_2 = `${SITE}/media?list=items&offset=1`
  const SPACE = `${SITE}/media-space`
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  const fake = { engine: 'core', severalSites: false, usedBytes: 0, quotaBytes: 1e9, stored: [], calls: [], doors: [] }
  /** What the fake's media read answers: the library in two pages, the second named by `bounded`. */
  const mediaRead = uri => (uri === MEDIA
    ? { items: [{ id: 'm-other', name: 'altro.jpg', size: 5 }], folders: [], bounded: [{ list: 'items', total: 2, offset: 0, shown: 1, next: MEDIA_PAGE_2 }] }
    : { items: [{ id: 'm-existing', name: 'gia.jpg', size: existing.length }], folders: [] })
  const http = createServer(async (request, response) => {
    let body = ''
    for await (const chunk of request) body += chunk
    const message = JSON.parse(body)
    const answer = (result) => {
      response.setHeader('content-type', 'application/json')
      response.end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }))
    }
    const text = (value, isError = false) => answer({ content: [{ type: 'text', text: JSON.stringify(value) }], ...(isError ? { isError: true } : {}) })
    if (message.method === 'initialize') return answer({ protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'libretto', version: 'test' } })
    if (message.id === undefined) return response.writeHead(202).end()
    const { name, arguments: args } = message.params
    fake.calls.push({ name, siteId: args.siteId })
    if (name === 'site_context') {
      if (fake.severalSites && args.siteId === undefined) return text({ sites: [{ id: 's1', name: 'Studio' }, { id: 's2', name: 'Shop' }], next: 'site_context with siteId' })
      return text({ engine: fake.engine, baseRevisions: { 'media/m-existing': 4 }, resources: [`${SITE}/pages`, MEDIA, SPACE] })
    }
    if (name === 'read_resources') {
      const resources = Object.fromEntries(args.uris.map(uri => [uri, uri === SPACE ? { usedBytes: fake.usedBytes, quotaBytes: fake.quotaBytes } : mediaRead(uri)]))
      return text({ resources })
    }
    assert.ok(name === 'apply_ops' || name === 'dry_run_ops', `unexpected tool ${name}`)
    assert.match(args.requestId, UUID)
    assert.deepEqual(args.baseRevisions, {})
    assert.equal(args.operations.length, 1)
    const [door] = args.operations
    const dryRun = name === 'dry_run_ops'
    fake.doors.push({ ...door, dryRun })
    if (door.input.filename === 'rifiuta.jpg') return text({ code: 'media_kind', message: 'refused for the test', status: 422 }, true)
    if (dryRun) return text({ ok: true, engine: 'core', dryRun: true, stored: false, checked: { contentType: door.input.contentType } })
    const id = door.name === 'font.uploadFace' ? `f-${door.input.fileName}` : `m-${door.input.filename}`
    fake.stored.push(door.input.filename ?? door.input.fileName)
    return text({ ok: true, engine: 'core', revision: fake.stored.length, entryId: `e-${id}`, revisions: {}, id, undo: { name: 'history.undo', input: { step: `e-${id}` } } })
  })
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${http.address().port}`
  const remote = start(process.execPath, [server], { cwd: work, env: { ...process.env, LIBRETTO_URL: url, LIBRETTO_MCP_TOKEN: 'test' } })
  const lastDoor = () => fake.doors.at(-1)

  await check('a file sends through media.uploadFile as base64 in data, alone in its batch, with no base revisions', async () => {
    fake.doors = []
    const answer = await remote.call('upload_media_file', { path: join(photos, 'a.jpg'), alt: 'A', folderId: 'folder-1' })
    assert.equal(answer.answer.id, 'm-a.jpg')
    assert.deepEqual(lastDoor(), { name: 'media.uploadFile', input: { filename: 'a.jpg', contentType: 'image/jpeg', data: Buffer.from('a').toString('base64'), folderId: 'folder-1', alt: 'A' }, dryRun: false })
  })
  await check('a file over 20 MB or a ZIP is refused before anything is sent, naming Admin › Media', async () => {
    fake.doors = []
    const large = await remote.call('upload_media_file', { path: join(photos, 'grande.jpg') })
    assert.match(large.error, /at most 20\.0 MB in one call\. A person uploads it in Admin › Media/)
    const archive = await remote.call('upload_media_file', { path: join(photos, 'archivio.zip') })
    assert.match(archive.error, /ZIP archive.*Admin › Media/)
    assert.deepEqual(fake.doors, [])
  })
  await check('a 12 MB PDF goes through', async () => {
    const documents = makeDir('documents')
    writeFileSync(join(documents, 'brochure.pdf'), Buffer.alloc(12 * MiB))
    const answer = await remote.call('upload_media_file', { path: join(documents, 'brochure.pdf'), dryRun: true })
    assert.equal(answer.error, undefined, JSON.stringify(answer))
    assert.equal(lastDoor().dryRun, true)
    assert.equal(lastDoor().input.contentType, 'application/pdf')
  })
  await check('replaces goes alone; with words it is refused before anything is sent', async () => {
    await remote.call('upload_media_file', { path: join(photos, 'b.png'), replaces: 'm-existing' })
    assert.equal(lastDoor().input.replaces, 'm-existing')
    const { error } = await remote.call('upload_media_file', { path: join(photos, 'b.png'), replaces: 'm-existing', alt: 'B' })
    assert.match(error, /send replaces alone, then change the words with media\.setMeta/)
  })
  await check('a font file of any of the four formats goes through font.uploadFace with its content type', async () => {
    const faces = makeDir('faces')
    const names = [['Sul.woff2', 'font/woff2'], ['Sul.woff', 'font/woff'], ['Sul.ttf', 'font/ttf'], ['Sul.otf', 'font/otf'], ['Upper.TTF', 'font/ttf']]
    fake.doors = []
    for (const [fileName] of names) {
      writeFileSync(join(faces, fileName), `bytes of ${fileName}`)
      await remote.call('upload_font_file', { path: join(faces, fileName), name: 'Sul Sans', weight: 400, style: 'normal' })
    }
    assert.deepEqual(fake.doors.map(door => [door.name, door.input.fileName, door.input.contentType, Buffer.from(door.input.data, 'base64').toString()]),
      names.map(([fileName, type]) => ['font.uploadFace', fileName, type, `bytes of ${fileName}`]))
  })
  await check('a variable font face takes a weight range, or no weight for the file\'s own range', async () => {
    const { result } = await remote.request('tools/list', {})
    const schema = result.tools.find(tool => tool.name === 'upload_font_file').inputSchema
    assert.equal(schema.required.includes('weight'), false)
    const faces = makeDir('variable')
    writeFileSync(join(faces, 'Flex.woff2'), 'variable bytes')
    await remote.call('upload_font_file', { path: join(faces, 'Flex.woff2'), name: 'Flex', weight: [200, 800], style: 'normal' })
    assert.deepEqual(lastDoor().input.weight, [200, 800])
    await remote.call('upload_font_file', { path: join(faces, 'Flex.woff2'), name: 'Flex', style: 'normal' })
    assert.equal('weight' in lastDoor().input, false)
  })
  await check('a dry run checks every file and the library, sends one file as a dry run and stores nothing', async () => {
    fake.stored = []
    fake.doors = []
    const answer = await remote.call('upload_media_files', { directory: photos, dryRun: true })
    assert.deepEqual(answer.counts, { files: 6, uploaded: 0, toUpload: 3, skipped: 1, refused: 2 })
    assert.deepEqual(answer.checkedOnServer, ['a.jpg'])
    assert.deepEqual(fake.doors.map(door => door.dryRun), [true])
    assert.deepEqual(fake.stored, [])
  })
  await check('a folder uploads its files, skips what the library holds (read past its first page), and reports each refusal', async () => {
    fake.stored = []
    const answer = await remote.call('upload_media_files', { directory: photos })
    assert.deepEqual(answer.uploaded, { 'a.jpg': 'm-a.jpg', 'b.png': 'm-b.png' })
    assert.deepEqual(answer.skipped, { 'gia.jpg': 'm-existing' })
    assert.deepEqual(Object.keys(answer.refused).sort(), ['archivio.zip', 'grande.jpg', 'rifiuta.jpg'])
    assert.match(answer.refused['grande.jpg'], /Admin › Media/)
    assert.equal(answer.refused['rifiuta.jpg'], 'refused for the test')
    assert.deepEqual(fake.stored, ['a.jpg', 'b.png'])
  })
  await check('a pattern and recursive pick the files', async () => {
    const answer = await remote.call('upload_media_files', { directory: photos, pattern: '*.{JPG}', recursive: true, skipExisting: false })
    assert.deepEqual(Object.keys(answer.uploaded).sort(), ['a.jpg', 'gia.jpg', join('sotto', 'c.jpg')].sort())
  })
  await check('paths upload a list of files', async () => {
    const answer = await remote.call('upload_media_files', { paths: [join(photos, 'b.png'), join(photos, 'gia.jpg')] })
    assert.deepEqual(answer.skipped, { [join(photos, 'gia.jpg')]: 'm-existing' })
    assert.deepEqual(Object.keys(answer.uploaded), [join(photos, 'b.png')])
  })
  await check('more than 50 files a call are refused before anything is sent', async () => {
    fake.calls = []
    const many = Array.from({ length: 51 }, (_, i) => join(photos, `f${i}.jpg`))
    const { error } = await remote.call('upload_media_files', { paths: many })
    assert.match(error, /at most 50 a call/)
    assert.deepEqual(fake.calls, [])
  })
  await check('files the media library has no space for are refused before any upload', async () => {
    fake.doors = []
    fake.usedBytes = fake.quotaBytes - 1
    const { error } = await remote.call('upload_media_files', { paths: [join(photos, 'a.jpg'), join(photos, 'b.png')], skipExisting: false })
    fake.usedBytes = 0
    assert.match(error, /free space in Admin › Media first/)
    assert.deepEqual(fake.doors, [])
  })
  await check('a siteId reaches site_context and the batches, never read_resources (its URIs name the site)', async () => {
    fake.calls = []
    await remote.call('upload_media_files', { paths: [join(photos, 'b.png')], siteId: 's1' })
    const byTool = Object.fromEntries(fake.calls.map(call => [call.name, call.siteId]))
    assert.deepEqual(byTool, { site_context: 's1', read_resources: undefined, apply_ops: 's1' })
  })
  await check('a token of several sites without siteId is told to name one', async () => {
    fake.severalSites = true
    const { error } = await remote.call('upload_media_file', { path: join(photos, 'a.jpg') })
    fake.severalSites = false
    assert.match(error, /give siteId, one of s1 \(Studio\), s2 \(Shop\)/)
  })
  await check('a site on the old engine is told to use the plugin 0.5', async () => {
    fake.engine = 'v3'
    fake.doors = []
    const { error } = await remote.call('upload_media_file', { path: join(photos, 'a.jpg') })
    fake.engine = 'core'
    assert.match(error, /core sites only: the Libretto plugin 0\.5 serves the old engine/)
    assert.deepEqual(fake.doors, [])
  })
  await check('an SVG\'s colour roles reach media.uploadFile as svgRoles, and are refused for another kind of file', async () => {
    await remote.call('upload_media_file', { path: join(drawings, 'glifo.svg'), svgAccentColor: '#3ccb7f', svgTextColor: '#000' })
    assert.deepEqual(lastDoor().input.svgRoles, { text: '#000', accent: '#3ccb7f' })
    await remote.call('upload_media_file', { path: join(drawings, 'glifo.svg') })
    assert.equal(lastDoor().input.svgRoles, undefined)
    const { error } = await remote.call('upload_media_file', { path: join(photos, 'a.jpg'), svgAccentColor: '#3ccb7f' })
    assert.match(error, /for an SVG file only/)
  })
  remote.stop()
  http.close()
} finally {
  for (const dir of temporary) rmSync(dir, { recursive: true, force: true })
}
if (failures > 0) {
  console.log(`${failures} failed`)
  process.exit(1)
}
