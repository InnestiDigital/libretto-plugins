#!/usr/bin/env node
// Builds the operation reference of the libretto plugin from Libretto's registry.
//
//   node scripts/build-reference.mjs                 write plugins/libretto/reference/operations/*.md
//   node scripts/build-reference.mjs --check         fail when a file is stale, an operation is not covered,
//                                                    a skill names an operation the registry lacks, or a link is broken
//   node scripts/build-reference.mjs --sync <app>    copy docs/ops/registry.json and mcp-tools.json from a
//                                                    splash-cms checkout into data/, then write
//   node scripts/build-reference.mjs --live          compare data/registry.json with a running server's
//                                                    discover_operations (LIBRETTO_URL, LIBRETTO_MCP_TOKEN)
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'data')
const pluginDir = join(root, 'plugins', 'libretto')
const outDir = join(pluginDir, 'reference', 'operations')
const readJson = path => JSON.parse(readFileSync(path, 'utf8'))

const args = process.argv.slice(2)
if (args[0] === '--sync') {
  const app = args[1]
  if (!app) fail('--sync needs the path of a splash-cms checkout')
  for (const file of ['registry.json', 'mcp-tools.json']) copyFileSync(join(app, 'docs', 'ops', file), join(dataDir, file))
}

const registry = readJson(join(dataDir, 'registry.json'))
const mcpTools = readJson(join(dataDir, 'mcp-tools.json'))
const domains = readJson(join(dataDir, 'domains.json'))
const permissions = readJson(join(dataDir, 'permissions.json'))
const notes = readJson(join(dataDir, 'notes.json'))
const operations = registry.operations
const names = new Set(operations.map(op => op.name))

function fail(message) {
  console.error(message)
  process.exit(1)
}

/** Every operation belongs to one domain, every permission is described, every note names a real operation. */
function coverageProblems() {
  const problems = []
  const prefixes = new Map()
  for (const [key, domain] of Object.entries(domains)) for (const prefix of domain.prefixes) prefixes.set(prefix, key)
  for (const op of operations) {
    if (!prefixes.has(op.name.split('.')[0])) problems.push(`uncovered: ${op.name} (add its prefix to data/domains.json)`)
    if (!permissions.classes[op.permission]) problems.push(`unknown permission: ${op.permission} of ${op.name} (add it to data/permissions.json)`)
  }
  for (const name of Object.keys(notes.operations)) if (!names.has(name)) problems.push(`stale note: ${name} is not in the registry (data/notes.json)`)
  return problems
}

const pending = new Set(notes.pending?.operations ?? [])  // names a skill may use before --sync brings them in (data/notes.json `pending`)

/**
 * Operation names written in the hand-written skills and recipes must exist in the registry (or be listed as
 * pending in data/notes.json), and their relative links must point at files that exist.
 */
function problemsInDocs() {
  const prefixes = new Set([...Object.values(domains).flatMap(domain => domain.prefixes), ...[...pending].map(name => name.split('.')[0])])
  const problems = []
  for (const name of pending) if (names.has(name)) problems.push(`pending ${name} is in the registry now: remove it from data/notes.json pending`)
  for (const file of [...markdownFiles(pluginDir), join(root, 'README.md')]) {
    if (file.startsWith(outDir)) continue
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(/`([a-z][a-zA-Z]*)\.([a-z][a-zA-Z_]*)`|"name": "([a-z][a-zA-Z]*)\.([a-z][a-zA-Z_]*)"/g)) {
      const name = match[1] ? `${match[1]}.${match[2]}` : `${match[3]}.${match[4]}`
      if (prefixes.has(name.split('.')[0]) && !names.has(name) && !pending.has(name) && !permissions.classes[name]) problems.push(`unknown operation ${name} in ${relative(root, file)}`)
    }
    for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = match[1].split('#')[0]
      if (!target || /^[a-z]+:/.test(target)) continue
      if (!existsSync(join(dirname(file), target))) problems.push(`broken link ${match[1]} in ${relative(root, file)}`)
    }
  }
  for (const dir of readdirSync(join(pluginDir, 'skills'))) {
    const skill = join(pluginDir, 'skills', dir, 'SKILL.md')
    const name = existsSync(skill) ? /^name: (.+)$/m.exec(readFileSync(skill, 'utf8'))?.[1] : null
    if (name !== dir) problems.push(`skills/${dir}/SKILL.md must exist and say name: ${dir}`)
  }
  return problems
}

function markdownFiles(dir) {
  return readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? markdownFiles(path) : path.endsWith('.md') ? [path] : []
  })
}

function renderAll() {
  const files = new Map()
  const byDomain = new Map(Object.keys(domains).map(key => [key, []]))
  for (const op of operations) {
    const key = Object.keys(domains).find(k => domains[k].prefixes.includes(op.name.split('.')[0]))
    byDomain.get(key)?.push(op)
  }
  for (const [key, ops] of byDomain) files.set(`${key}.md`, renderDomain(key, ops))
  files.set('README.md', renderIndex(byDomain))
  files.set('mcp-tools.md', renderTools())
  return files
}

const HEADER = '<!-- Generated by scripts/build-reference.mjs from data/registry.json. Do not edit by hand. -->\n\n'

function renderIndex(byDomain) {
  const lines = [HEADER + '# Libretto operations', '']
  lines.push(`${operations.length} operations, from Libretto's operation registry. Each runs inside a \`splash.batch\` sent to \`dry_run_ops\` or \`apply_ops\` (see [mcp-tools.md](mcp-tools.md)). \`discover_operations\` with the name gives the live schema; this reference is the same registry, written for reading.`, '')
  lines.push('| Domain | Operations |', '|---|---|')
  for (const [key, ops] of byDomain) lines.push(`| [${domains[key].title}](${key}.md) | ${ops.map(op => `\`${op.name}\``).join(', ')} |`)
  lines.push('', '## Batches', '')
  lines.push('- A batch is `{ format: "splash.batch", v: 1, requestId, baseRevisions, operations: [{ name, input, ref? }], dryRun?, confirmed? }`, at most 100 operations, all or nothing.')
  lines.push('- `requestId`: a fresh UUID per intent. Resending the identical batch with the same id replays the stored answer; the same id with a different batch is refused.')
  lines.push('- `baseRevisions`: the revision of every document the operations write (each operation lists its `writes` below; `{pageId}` is filled from the input). Every key you pass is checked, so pass the written ones: a key that moved since (including `history`, which moves on every commit to the site) refuses the batch with 409. `history` is required only by publication. After an apply, the answer\'s `revisions` are the new values.')
  lines.push('- `ref` names an operation\'s output so a later operation in the same batch can use it: `{ "$ref": { "operation": "<ref>", "path": ["nodeId"] } }`.')
  lines.push('- `confirmed`: `["destructive"]` or `["publish"]` when an operation below says so.')
  lines.push('- Read operations (class `read`) also run through `dry_run_ops`, which makes no change.')
  lines.push('- Operations that are not undoable, and external ones (provider effects, publication), must be alone in their batch; external ones cannot be dry-run.', '')
  lines.push('## Permissions', '', permissions.note, '', '| Class | Means | Token roles that hold it |', '|---|---|---|')
  for (const [cls, entry] of Object.entries(permissions.classes)) lines.push(`| \`${cls}\` | ${entry.label} | ${entry.roles.join(', ')} |`)
  lines.push('', '## Errors', '')
  for (const entry of notes.errors) lines.push(`- **${entry.code}**: ${entry.meaning} ${entry.fix}`)
  lines.push('')
  return lines.join('\n')
}

function renderTools() {
  const lines = [HEADER + '# MCP tools and resources', '']
  for (const tool of mcpTools.tools) {
    lines.push(`## \`${tool.name}\``, '', tool.description, '')
    const hints = Object.entries(tool.annotations ?? {}).map(([k, v]) => `${k}: ${v}`).join(', ')
    if (hints) lines.push(`Hints: ${hints}.`, '')
    if (tool.example) lines.push('```json', JSON.stringify(tool.example, null, 2), '```', '')
  }
  lines.push('## Resources', '', 'Each URI is `splash://site/<siteId>/<path>`; `site_context.resources` lists the ones the site has.', '', '| Path | Holds |', '|---|---|')
  for (const resource of mcpTools.resources) lines.push(`| \`${resource.path}\` | ${resource.description} |`)
  lines.push('')
  return lines.join('\n')
}

function renderDomain(key, ops) {
  const domain = domains[key]
  const lines = [HEADER + `# ${domain.title}`, '', domain.intro, '']
  lines.push(ops.map(op => `[\`${op.name}\`](#${anchor(op.name)})`).join(' · '), '')
  for (const op of ops) lines.push(...renderOperation(op))
  return lines.join('\n')
}

const anchor = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '')

function renderOperation(op) {
  const lines = [`## ${op.name}`, '', op.description, '']
  const facts = [
    `permission \`${op.permission}\` (${permissions.classes[op.permission].roles.join(', ')})`,
    `class \`${op.mutationClass}\``,
    op.writes.length ? `writes ${op.writes.map(w => `\`${w}\``).join(', ')}` : 'writes nothing',
    op.confirm !== 'none' ? `needs \`"confirmed": ["${op.confirm}"]\`` : null,
    op.writes.length ? (op.undoable ? 'undoable with `history.undo`' : '**not undoable**: alone in its batch') : null,
    op.mutationClass === 'external' ? 'external: alone in its batch, never in a dry run' : null,
  ].filter(Boolean)
  lines.push(`- ${facts.join('; ')}.`)
  const fields = describeFields(op.inputSchema)
  if (fields.length) {
    lines.push('', '| Input | Type | Required |', '|---|---|---|')
    for (const field of fields) lines.push(`| \`${field.path}\` | ${escape(field.type)} | ${field.required ? 'yes' : ''} |`)
  } else lines.push('- Input: `{}`.')
  if (op.outputSchema) lines.push('', `Output: ${escape(typeText(op.outputSchema, op.outputSchema.$defs ?? {}, 0)).replace(/\n/g, ' ')}`)
  lines.push('', 'Example input:', '', '```json', JSON.stringify(op.example), '```', '')
  for (const note of notes.operations[op.name] ?? []) lines.push(`> ${note}`, '')
  return lines
}

const escape = text => text.replace(/\|/g, '\\|')

/** The input's fields, one row each, nested object fields as dotted paths (two levels). */
function describeFields(schema) {
  const defs = schema.$defs ?? {}
  const rows = []
  const walk = (node, prefix, depth) => {
    const resolved = resolve(node, defs)
    for (const [name, child] of Object.entries(resolved.properties ?? {})) {
      const path = prefix ? `${prefix}.${name}` : name
      const target = resolve(child, defs)
      const nested = depth < 1 && target.type === 'object' && target.properties && Object.keys(target.properties).length <= 12
      rows.push({ path, type: nested ? 'object' : typeText(child, defs, 0), required: (resolved.required ?? []).includes(name) })
      if (nested) walk(target, path, depth + 1)
    }
  }
  walk(schema, '', 0)
  return rows
}

function resolve(node, defs) {
  let current = node
  for (let guard = 0; current && current.$ref && guard < 20; guard++) current = defs[current.$ref.replace('#/$defs/', '')]
  return current ?? {}
}

const LOCALE = '^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\\d{3}))?$'
const MAX_TYPE = 320

function typeText(node, defs, depth) {
  const text = typeOf(node, defs, depth)
  return text.length > MAX_TYPE ? `${text.slice(0, MAX_TYPE)}… (full schema: discover_operations)` : text
}

function typeOf(node, defs, depth) {
  const s = resolve(node, defs)
  if (depth > 5) return '…'
  if ('const' in s) return JSON.stringify(s.const)
  if (s.enum) return s.enum.map(v => JSON.stringify(v)).join(' | ')
  const union = s.anyOf ?? s.oneOf
  if (union) return union.map(part => typeOf(part, defs, depth + 1)).join(' | ')
  const type = Array.isArray(s.type) ? s.type.join(' | ') : s.type
  if (type === 'string') {
    if (s.format === 'uuid') return 'uuid'
    if (s.pattern === '^[0-9a-z]{8}$') return 'nodeId'
    if (s.pattern === LOCALE) return 'locale'
    const limits = [s.minLength ? `min ${s.minLength}` : '', s.maxLength ? `max ${s.maxLength}` : ''].filter(Boolean).join(', ')
    return limits ? `string (${limits})` : 'string'
  }
  if (type === 'integer' || type === 'number') {
    const limits = ['minimum' in s ? `≥${s.minimum}` : '', 'maximum' in s && s.maximum < 1e9 ? `≤${s.maximum}` : ''].filter(Boolean).join(' ')
    return limits ? `${type} ${limits}` : type
  }
  if (type === 'array') return `${wrap(typeOf(s.items ?? {}, defs, depth + 1))}[]${s.maxItems ? ` (≤${s.maxItems})` : ''}`
  if (type === 'object' || s.properties) {
    if (s.properties) {
      const required = new Set(s.required ?? [])
      return `{ ${Object.entries(s.properties).map(([k, v]) => `${k}${required.has(k) ? '' : '?'}: ${typeOf(v, defs, depth + 1)}`).join(', ')} }`
    }
    if (s.additionalProperties && typeof s.additionalProperties === 'object') {
      const keys = resolve(s.propertyNames ?? {}, defs).pattern === LOCALE ? 'locale' : 'string'
      return `Record<${keys}, ${typeOf(s.additionalProperties, defs, depth + 1)}>`
    }
    return 'object'
  }
  if (type) return type
  return 'any'
}

const wrap = text => (text.includes(' | ') ? `(${text})` : text)

async function compareLive() {
  const url = `${process.env.LIBRETTO_URL ?? 'https://librettocms.com'}/api/mcp`
  const token = process.env.LIBRETTO_MCP_TOKEN
  if (!token) fail('--live needs LIBRETTO_MCP_TOKEN')
  const headers = new Headers({ 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${token}` })
  const rpc = async body => {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    const session = response.headers.get('mcp-session-id')
    if (session) headers.set('mcp-session-id', session)
    const text = await response.text()
    if (!response.ok) fail(`${response.status} from ${url}: ${text.slice(0, 200)}`)
    if (!text) return null
    return JSON.parse(text.startsWith('{') ? text : text.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5)).join(''))
  }
  await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'libretto-reference-check', version: '1' } } })
  await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' })
  const live = new Set()
  for (let cursor = 0; cursor !== null;) {
    const answer = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'discover_operations', arguments: { query: '', cursor, limit: 100 } } })
    // Libretto answers tools as JSON text; older servers also sent structuredContent.
    const text = answer.result.content?.find(part => part.type === 'text')?.text
    const page = text === undefined ? answer.result.structuredContent : JSON.parse(text)
    for (const op of page.operations) live.add(op.name)
    cursor = page.nextCursor
  }
  const missing = [...live].filter(name => !names.has(name))
  const gone = [...names].filter(name => !live.has(name))
  console.log(`live: ${live.size} operations visible to this token; reference: ${names.size}`)
  if (gone.length) console.log(`not visible to this token (role, or removed): ${gone.join(', ')}`)
  if (missing.length) fail(`on the server but not in data/registry.json: ${missing.join(', ')} (run --sync)`)
}

async function main() {
  if (args[0] === '--live') await compareLive()
  else {
    const problems = coverageProblems()
    if (problems.length) fail(problems.join('\n'))
    const files = renderAll()
    if (args[0] === '--check') {
      for (const [file, text] of files) {
        const path = join(outDir, file)
        if (!existsSync(path) || readFileSync(path, 'utf8') !== text) problems.push(`stale: reference/operations/${file} (run node scripts/build-reference.mjs)`)
      }
      const expected = new Set(files.keys())
      for (const file of existsSync(outDir) ? readdirSync(outDir) : []) if (!expected.has(file)) problems.push(`stray: reference/operations/${file}`)
      problems.push(...problemsInDocs())
      if (problems.length) fail(problems.join('\n'))
      console.log(`reference up to date: ${operations.length} operations in ${files.size - 2} domains${pending.size ? `; pending (not in data/registry.json yet): ${[...pending].join(', ')}` : ''}`)
    } else {
      mkdirSync(outDir, { recursive: true })
      for (const [file, text] of files) writeFileSync(join(outDir, file), text)
      console.log(`wrote ${files.size} files for ${operations.length} operations`)
    }
  }
}

await main()
