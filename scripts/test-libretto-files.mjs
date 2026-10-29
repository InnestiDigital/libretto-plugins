#!/usr/bin/env node
// Checks the plugin's libretto-files server without a real Libretto:
//   - how it is started: the launcher finds Node where an app's minimal PATH does not;
//   - how it resolves the paths it is given (every case stops in the local file checks);
//   - upload_media_files against a small fake Libretto MCP endpoint.
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

  // --- upload_media_files against a fake Libretto ---------------------------------------
  const photos = makeDir('photos')
  const existing = Buffer.from('already there')
  writeFileSync(join(photos, 'gia.jpg'), existing)
  writeFileSync(join(photos, 'a.jpg'), 'a')
  writeFileSync(join(photos, 'b.png'), 'b')
  writeFileSync(join(photos, 'rifiuta.jpg'), 'refused by the fake server')
  writeFileSync(join(photos, 'grande.jpg'), Buffer.alloc(5 * 1024 * 1024 + 1))
  writeFileSync(join(photos, 'note.txt'), 'not media')
  writeFileSync(join(photos, '.nascosta.jpg'), 'hidden')
  mkdirSync(join(photos, 'sotto'))
  writeFileSync(join(photos, 'sotto', 'c.jpg'), 'c')

  const drawings = makeDir('drawings')
  writeFileSync(join(drawings, 'glifo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24" stroke="#3ccb7f"/></svg>')

  const fake = { revision: 7, stored: [], staleOnce: false, siteIds: [], inputs: [], fonts: [] }
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
    fake.siteIds.push(args.siteId)
    if (name === 'site_context') return text({ baseRevisions: { media: fake.revision, fonts: 3 } })
    const [operation] = args.operations
    assert.equal(args.format, 'libretto.batch')
    if (operation.name === 'media.list') {
      return text({ revisions: { media: fake.revision }, results: [{ name: 'media.list', output: { items: [{ id: 'm-existing', filename: 'gia.jpg', size: existing.length }], total: 1, page: operation.input.page, perPage: 100, usedBytes: 0, quotaBytes: 1e9 } }] })
    }
    if (operation.name === 'font.upload') {
      fake.fonts.push({ fileName: operation.input.fileName, bytes: Buffer.from(operation.input.data, 'base64').toString() })
      return text({ revisions: { fonts: 3 }, results: [{ name: 'font.upload', output: { id: 'f-1', name: operation.input.name } }] })
    }
    if (args.baseRevisions.media !== fake.revision) return text({ status: 409, code: 'stale_revision', message: 'media moved' }, true)
    if (operation.input.filename === 'rifiuta.jpg') return text({ status: 422, message: 'refused for the test' }, true)
    const dryRun = name === 'dry_run_ops'
    fake.inputs.push(operation.input)
    if (!dryRun) {
      fake.stored.push(operation.input.filename)
      fake.revision++
      // Someone else uploads once, between two of ours: the next batch is stale.
      if (fake.staleOnce) { fake.staleOnce = false; fake.revision++ }
    }
    return text({ revisions: { media: fake.revision }, results: [{ name: 'media.upload', output: { id: `m-${operation.input.filename}`, filename: operation.input.filename } }] })
  })
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${http.address().port}`
  const remote = start(process.execPath, [server], { cwd: work, env: { ...process.env, LIBRETTO_URL: url, LIBRETTO_MCP_TOKEN: 'test' } })

  await check('a font file of any of the four formats is sent as it is, for the server to convert', async () => {
    const faces = makeDir('faces')
    const names = ['Sul.woff2', 'Sul.woff', 'Sul.ttf', 'Sul.otf', 'Upper.TTF']
    for (const fileName of names) {
      writeFileSync(join(faces, fileName), `bytes of ${fileName}`)
      await remote.call('upload_font_file', { path: join(faces, fileName), name: 'Sul Sans', weight: 400, style: 'normal' })
    }
    assert.deepEqual(fake.fonts, names.map(fileName => ({ fileName, bytes: `bytes of ${fileName}` })))
  })
  await check('a dry run checks every file and stores nothing', async () => {
    const answer = await remote.call('upload_media_files', { directory: photos, dryRun: true })
    assert.deepEqual(answer.counts, { files: 5, uploaded: 0, toUpload: 3, skipped: 1, refused: 1 })
    assert.equal(answer.checkedOnServer.length, 1)
    assert.deepEqual(fake.stored, [])
  })
  await check('a folder uploads its media files, skips what the library holds, and reports each refusal', async () => {
    fake.staleOnce = true
    const answer = await remote.call('upload_media_files', { directory: photos })
    assert.deepEqual(answer.uploaded, { 'a.jpg': 'm-a.jpg', 'b.png': 'm-b.png' })
    assert.deepEqual(answer.skipped, { 'gia.jpg': 'm-existing' })
    assert.deepEqual(Object.keys(answer.refused).sort(), ['grande.jpg', 'rifiuta.jpg'])
    assert.match(answer.refused['grande.jpg'], /up to 5 MB/)
    assert.equal(answer.refused['rifiuta.jpg'], 'refused for the test')
    assert.deepEqual(fake.stored, ['a.jpg', 'b.png'])
  })
  await check('a pattern and recursive pick the files', async () => {
    fake.stored = []
    const answer = await remote.call('upload_media_files', { directory: photos, pattern: '*.{JPG}', recursive: true, skipExisting: false })
    assert.deepEqual(Object.keys(answer.uploaded).sort(), ['a.jpg', 'gia.jpg', join('sotto', 'c.jpg')].sort())
  })
  await check('paths upload a list of files', async () => {
    const answer = await remote.call('upload_media_files', { paths: [join(photos, 'b.png'), join(photos, 'gia.jpg')] })
    assert.deepEqual(answer.skipped, { [join(photos, 'gia.jpg')]: 'm-existing' })
    assert.deepEqual(Object.keys(answer.uploaded), [join(photos, 'b.png')])
  })
  await check('a siteId reaches every call to Libretto, for a token of several sites', async () => {
    fake.siteIds = []
    await remote.call('upload_media_files', { paths: [join(photos, 'b.png')], skipExisting: false, siteId: 'site-b' })
    assert.ok(fake.siteIds.length > 0)
    assert.deepEqual([...new Set(fake.siteIds)], ['site-b'])
    fake.siteIds = []
    await remote.call('upload_media_files', { paths: [join(photos, 'b.png')], skipExisting: false })
    assert.deepEqual([...new Set(fake.siteIds)], [undefined])
  })
  await check('an SVG\'s colour roles reach media.upload as svgRoles, and are refused for another kind of file', async () => {
    fake.inputs = []
    await remote.call('upload_media_file', { path: join(drawings, 'glifo.svg'), svgAccentColor: '#3ccb7f', svgTextColor: '#000' })
    assert.deepEqual(fake.inputs.at(-1)?.svgRoles, { text: '#000', accent: '#3ccb7f' })
    await remote.call('upload_media_file', { path: join(drawings, 'glifo.svg') })
    assert.equal(fake.inputs.at(-1)?.svgRoles, undefined)
    const { error } = await remote.call('upload_media_file', { path: join(photos, 'a.jpg'), svgAccentColor: '#3ccb7f' })
    assert.match(error, /for an SVG file only/)
  })
  await check('more files than a call takes are refused before anything is sent', async () => {
    const many = Array.from({ length: 101 }, (_, i) => join(photos, `f${i}.jpg`))
    const { error } = await remote.call('upload_media_files', { paths: many.slice(0, 100), directory: photos })
    assert.match(error, /at most 100 a call/)
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
