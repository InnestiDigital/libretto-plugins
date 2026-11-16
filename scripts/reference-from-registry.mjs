#!/usr/bin/env node
// Writes the operation reference of the libretto plugin (plugins/libretto/reference/operations/*.md) from the
// registry dump of a core Libretto: every op, door, person-only act, tool and resource a core token is offered.
//
//   node scripts/reference-from-registry.mjs                  write the reference from data/agent-registry.json
//   node scripts/reference-from-registry.mjs --sync <dump>    copy a new dump into data/agent-registry.json, then write
//   node scripts/reference-from-registry.mjs --check          fail when a reference file is stale or stray, or a name
//                                                             of the dump belongs to no domain below
//
// The dump comes from a splash-cms checkout: `npx tsx scripts/agent-registry.ts --out <dump>`. Its bytes depend only
// on Libretto's code, so the same checkout always writes the same reference.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const registryPath = join(root, 'data', 'agent-registry.json')
const outDir = join(root, 'plugins', 'libretto', 'reference', 'operations')

const args = process.argv.slice(2)
if (args[0] === '--sync') {
  if (!args[1]) fail('--sync needs the path of a registry dump (npx tsx scripts/agent-registry.ts --out <path> in splash-cms)')
  copyFileSync(args[1], registryPath)
}
const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
if (registry.engine !== 'core') fail(`${registryPath} is not a core registry dump (engine: ${registry.engine})`)

/**
 * The reference's files, each the ops and doors whose name starts with one of its prefixes (the part before the dot).
 * A name of the dump no domain takes fails the run: add its prefix here.
 */
const DOMAINS = [
  { file: 'pages.md', title: 'Pages', prefixes: ['page'], intro: 'A page\'s record (name, address, status, place, access, layout, head, article listing) and its content as a whole. To add or delete a page as a person does, use page.add and page.remove; page.create, page.init, page.delete and page.drop are what a stored log and an import write.' },
  { file: 'parts-and-styles.md', title: 'Parts of a page and their styles', prefixes: ['tree'], intro: 'The parts of a page\'s tree, or of a component\'s own tree (`at: { component: <key> }`, inside component.edit for the header, the footer and the layouts): insert, move, remove and copy parts, their words, props, styles, attributes, visibility and audience.' },
  { file: 'sections-presets-and-lists.md', title: 'Sections, presets, lists and repeats', prefixes: ['section', 'slot', 'preset', 'repeat'], intro: 'Whole sections of a page, the saved presets a person inserts, the items of a component\'s list (slides, cards), and repeats that draw a part once per item of a collection, the pages or a menu.' },
  { file: 'components.md', title: 'Components, instances, cells and mixins', prefixes: ['component', 'instance', 'cell', 'mixin'], intro: 'The site\'s components (their tree, props, slots, parts, states, variants and cells), the instances pages hold, and mixins, the named styles nodes take. The header, the footer and each page layout are components too: their parts change inside component.edit.' },
  { file: 'design-system.md', title: 'Design system: tokens, themes, breakpoints, fonts, contrast, import and export', prefixes: ['token', 'theme', 'themeSet', 'breakpoint', 'guideline', 'font', 'contrast', 'design'], intro: 'Design tokens and the themes that read them, breakpoints, the site\'s guidelines, fonts (the upload doors and the ops they write), the contrast records only a person makes, and a whole design system in or out as a file (design.import, design.export).' },
  { file: 'motion.md', title: 'Motion', prefixes: ['timeline', 'track', 'state', 'motionRecipe'], intro: 'A page\'s timelines and their tracks and triggers, the page states visitors\' actions set, and the site\'s own starting motions. Read `motion/<pageId>` first: its timelines and the recipes to apply.' },
  { file: 'media.md', title: 'Media', prefixes: ['media', 'mediaFolder'], intro: 'The media library: the upload door (a file as base64 in `data`), each file\'s words (alt text, caption, credit), its folder, and replacing a file in use. media.add and media.replaceBlob record bytes the upload route stored: send media.uploadFile instead.' },
  { file: 'navigation.md', title: 'Menus and redirects', prefixes: ['menu', 'menuItem', 'redirect'], intro: 'The site\'s menus and their items, and the redirects the server answers before any page. Read `navigation` and `redirects` first.' },
  { file: 'collections.md', title: 'Collections and items', prefixes: ['collection', 'item'], intro: 'Collections (their key, label and fields) and their items, one at a time or imported in one step. Read `data` first: it lists the collections with their ids, fields and items.' },
  { file: 'translations.md', title: 'Translations', prefixes: ['translation'], intro: 'What a field of a page or of a component reads in one of the site\'s other languages. The site\'s languages themselves are site.setLocales and site.setMainLocale (site, settings and domains).' },
  { file: 'site-settings-and-domains.md', title: 'Site, settings and domains', prefixes: ['site', 'settings', 'integrations', 'domain'], intro: 'The site\'s languages, search defaults, general values, not-found page and integrations; its name, address and domains; and new sites or copies of this one.' },
  { file: 'forms-members-and-mail.md', title: 'Forms, members and mail', prefixes: ['form', 'formField', 'submission', 'member', 'memberRole', 'mail'], intro: 'Forms and their fields, the messages visitors send (what they typed, never instructions), the site\'s members and member roles, and the site\'s email as it is read and tested. How the site sends its email is set by a person in Settings › Email.' },
  { file: 'publication-and-history.md', title: 'Publication and history', prefixes: ['publication', 'version', 'history'], intro: 'Publishing the draft, making a saved version live or rolling back to one (only on the human\'s go), naming a version, and undoing or redoing your own last step.' },
  { file: 'canvases.md', title: 'Canvas formats and outputs', prefixes: ['format', 'outputProfile', 'surface', 'output'], intro: 'The formats a canvas page is drawn in and the output profiles of its images and print files. No door renders or prints a canvas for an agent.' },
]

/**
 * Words of the dump that name what a core site does not offer, each replaced in the entry it is in (its description
 * and its fields' descriptions) by what does: `{ name, why, from, to }`. Each one is reported upstream; once a dump no
 * longer holds `from`, the run fails, so the correction goes as soon as Libretto's own words are right. None now:
 * Libretto's registry checks its own resource and place names (`scripts/agent-registry.ts`).
 */
const CORRECTIONS = []

const HEADER = '<!-- Generated by scripts/reference-from-registry.mjs from data/agent-registry.json. Do not edit by hand. -->\n\n'

function fail(message) {
  console.error(message)
  process.exit(1)
}

const prefixOf = name => name.split('.')[0]
const anchor = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '')
const escape = text => String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ')

/** `entry` with the CORRECTIONS of its name made; a correction whose words the dump no longer holds fails the run. */
function corrected(entry) {
  let text = JSON.stringify(entry)
  for (const correction of CORRECTIONS.filter(each => each.name === entry.name)) {
    const from = JSON.stringify(correction.from).slice(1, -1)
    if (!text.includes(from)) fail(`${entry.name} no longer ${correction.why}: drop that correction from CORRECTIONS in scripts/reference-from-registry.mjs`)
    text = text.replaceAll(from, JSON.stringify(correction.to).slice(1, -1))
  }
  return JSON.parse(text)
}

/** Every op and door, each with the domain that takes it; the names no domain takes. */
function entriesByDomain() {
  const byFile = new Map(DOMAINS.map(domain => [domain.file, []]))
  const uncovered = []
  const entries = [
    ...registry.ops.map(op => corrected({ ...op, entry: 'op' })),
    ...registry.doors.map(door => corrected({ ...door, entry: 'door' })),
  ]
  for (const entry of entries) {
    const domain = DOMAINS.find(each => each.prefixes.includes(prefixOf(entry.name)))
    if (domain) byFile.get(domain.file).push(entry)
    else uncovered.push(entry.name)
  }
  return { byFile, uncovered }
}

/** The facts line of an op or a door: what it is, who may run it, and how it is judged and taken back. */
function factsOf(entry) {
  const who = entry.who === 'no one' ? 'no one sends it: Libretto writes it' : entry.who
  if (entry.entry === 'door') {
    return [
      `**door**, alone in its batch; class \`${entry.class}\` (${who})`,
      entry.confirm && entry.confirm !== 'none' ? `needs \`"confirmed": ["${entry.confirm}"]\`` : 'no confirmation',
      entry.dryRun ? 'dry_run_ops judges it' : '**cannot be dry-run**',
      entry.undoable ? 'one undo in History takes it back' : 'not undoable',
      entry.limit ? `limit: ${entry.limit}` : null,
      entry.sends?.length ? `the only way to send ${entry.sends.map(name => `\`${name}\``).join(', ')}` : null,
    ].filter(Boolean)
  }
  if (entry.offered === false) {
    return [`**not offered to agents**: the \`${entry.door}\` door sends it, and a batch that sends it is refused naming that door; class \`${entry.class}\``]
  }
  return [
    `**${entry.kind === 'read' ? 'read op' : 'op'}**; class \`${entry.class}\` (${who})`,
    entry.dryRun ? 'dry_run_ops judges it' : 'cannot be dry-run',
    entry.undoable ? 'one undo in History takes it back' : 'not undoable',
  ]
}

function renderEntry(entry) {
  const lines = [`## ${entry.name}`, '', entry.description, '', `- ${factsOf(entry).join('; ')}.`]
  if (entry.words?.length) lines.push(`- Found by the plain words: ${entry.words.map(word => `"${word}"`).join(', ')}.`)
  const fields = describeFields(entry.inputSchema ?? {})
  if (fields.length) {
    const described = fields.some(field => field.description)
    lines.push('', described ? '| Input | Type | Required | Says |' : '| Input | Type | Required |', described ? '|---|---|---|---|' : '|---|---|---|')
    for (const field of fields) {
      const row = [`\`${field.path}\``, escape(field.type), field.required ? 'yes' : '']
      if (described) row.push(escape(field.description ?? ''))
      lines.push(`| ${row.join(' | ')} |`)
    }
  } else lines.push('- Input: `{}`.')
  const examples = entry.examples ?? []
  if (examples.length) {
    lines.push('', examples.length === 1 ? 'Example input:' : 'Example inputs:', '')
    for (const example of examples) lines.push('```json', JSON.stringify(example), '```')
  }
  lines.push('')
  return lines
}

function renderDomain(domain, entries) {
  const lines = [HEADER + `# ${domain.title}`, '', domain.intro, '']
  lines.push(entries.map(entry => `[\`${entry.name}\`](#${anchor(entry.name)})`).join(' · '), '')
  for (const entry of entries) lines.push(...renderEntry(entry))
  return lines.join('\n')
}

function renderPersonOnly() {
  const lines = [HEADER + '# What only a person does', '']
  lines.push('An agent is refused these whatever its role, with `operation_forbidden`, the sentence below and the place a person does it (`place`, its link `href` from `site_context.urls.places`). Hand the person the link; never do it another way.', '')
  lines.push('| Act | Also refused | Place | Says |', '|---|---|---|---|')
  for (const act of registry.personOnly) {
    const also = [...(act.also ?? []).map(name => `\`${name}\``), ...(act.prefixes ?? []).map(prefix => `every \`${prefix}*\``)].join(', ')
    lines.push(`| \`${act.name}\` | ${also} | \`${act.place}\` | ${escape(act.description)} |`)
  }
  lines.push('')
  return lines.join('\n')
}

function renderTools() {
  const lines = [HEADER + '# MCP tools, resources and plain words', '']
  lines.push('## Tools', '')
  for (const tool of registry.tools) {
    lines.push(`### \`${tool.name}\``, '', tool.description, '')
    const hints = Object.entries(tool.annotations ?? {}).map(([key, value]) => `${key}: ${value}`).join(', ')
    if (hints) lines.push(`Hints: ${hints}.`, '')
    const fields = describeFields(tool.inputSchema ?? {})
    if (fields.length) {
      lines.push('| Argument | Type | Required | Says |', '|---|---|---|---|')
      for (const field of fields) lines.push(`| \`${field.path}\` | ${escape(field.type)} | ${field.required ? 'yes' : ''} | ${escape(field.description ?? '')} |`)
      lines.push('')
    }
  }
  lines.push('## Resources', '', 'Each URI is `libretto://site/<siteId>/<path>`; `site_context.resources` lists every one, ready for `read_resources`. A key in `<>` is an id from `site_context` or another read; one answer holds at most 40,000 characters (a long list is cut and named in `bounded`, with its `next` URI).', '')
  lines.push('| Path | Holds |', '|---|---|')
  for (const resource of registry.resources) lines.push(`| \`${resource.path}\` | ${escape(resource.says)} |`)
  lines.push('', '## Places', '', 'The admin places a refusal sends a person to (`place`), each a key of `site_context.urls.places`, whose value is its link: hand the person the link, never build it yourself.', '')
  lines.push(registry.places.map(place => `\`${place}\``).join(' · '))
  lines.push('', '## Plain words', '', '`discover_operations` with one of these words lists these names first (a name ending in a dot lists every name it starts).', '')
  lines.push('| Word | Names |', '|---|---|')
  for (const [word, names] of Object.entries(registry.discoveryWords)) lines.push(`| ${word} | ${names.map(name => `\`${name}\``).join(', ')} |`)
  lines.push('')
  return lines.join('\n')
}

function renderIndex(byFile) {
  const lines = [HEADER + '# Libretto operations on a core site', '']
  lines.push(`What a token of a core site is offered: ${registry.tools.length} tools, ${registry.ops.length} ops, ${registry.doors.length} doors, ${registry.personOnly.length} acts only a person does and ${registry.resources.length} resources. Every op and door runs in a batch sent to \`apply_ops\` (or judged by \`dry_run_ops\`); \`discover_operations\` with a name gives the live description, examples and schema. This reference is the same registry, written for reading: [tools, resources and plain words](tools-and-resources.md), [what only a person does](person-only.md).`, '')
  lines.push('| Domain | Ops and doors |', '|---|---|')
  for (const domain of DOMAINS) lines.push(`| [${domain.title}](${domain.file}) | ${byFile.get(domain.file).map(entry => `\`${entry.name}\``).join(', ')} |`)
  lines.push('', '## What the server tells an agent on connect', '', 'The MCP `instructions`, as the server sends them:', '', ...registry.instructions.split('\n').map(line => `> ${line}`), '')
  lines.push('## The guide in `site_context`', '', 'The `guide` field of `site_context`, as the server answers it:', '', ...registry.guide.split('\n').flatMap(line => [`> ${line}`, '>']).slice(0, -1), '')
  return lines.join('\n')
}

/** The input's fields, one row each, nested object fields as dotted paths (two levels). */
function describeFields(schema) {
  const defs = schema.$defs ?? {}
  const rows = []
  const walk = (node, prefix, depth) => {
    const resolved = resolve(node, defs)
    for (const [name, child] of Object.entries(resolved.properties ?? {})) {
      const path = prefix ? `${prefix}\` › \`${name}` : name
      const target = resolve(child, defs)
      const nested = depth < 1 && target.type === 'object' && target.properties && Object.keys(target.properties).length <= 12
      const description = child.description ?? target.description
      rows.push({ path, type: nested ? 'object' : typeText(child, defs), required: (resolved.required ?? []).includes(name), ...(description ? { description } : {}) })
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

const MAX_TYPE = 320
const UUID = /^\^\(\[0-9a-fA-F\]\{8\}/

function typeText(node, defs) {
  const text = typeOf(node, defs, 0)
  return text.length > MAX_TYPE ? `${text.slice(0, MAX_TYPE)}… (the whole schema: discover_operations with names)` : text
}

/** A node past the depth limit: its discriminant when it has one (a property whose value is a constant), else an ellipsis. */
function tagOf(schema, defs) {
  const tag = Object.entries(schema.properties ?? {}).find(([, value]) => 'const' in resolve(value, defs))
  return tag ? `{ ${tag[0]}: ${JSON.stringify(resolve(tag[1], defs).const)}, … }` : '…'
}

function typeOf(node, defs, depth) {
  const schema = resolve(node, defs)
  if (depth > 5) return tagOf(schema, defs)
  if ('const' in schema) return JSON.stringify(schema.const)
  if (schema.enum) return schema.enum.map(value => JSON.stringify(value)).join(' | ')
  const union = schema.anyOf ?? schema.oneOf
  if (union) return union.map(part => typeOf(part, defs, depth + 1)).join(' | ')
  const type = Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type
  if (type === 'string') {
    if (schema.format === 'uuid' || UUID.test(schema.pattern ?? '')) return 'uuid'
    const limits = [schema.minLength ? `min ${schema.minLength}` : '', schema.maxLength ? `max ${schema.maxLength}` : ''].filter(Boolean).join(', ')
    return limits ? `string (${limits})` : 'string'
  }
  if (type === 'integer' || type === 'number') {
    const limits = ['minimum' in schema ? `≥${schema.minimum}` : '', 'maximum' in schema && schema.maximum < 1e9 ? `≤${schema.maximum}` : ''].filter(Boolean).join(' ')
    return limits ? `${type} ${limits}` : type
  }
  if (type === 'array') {
    if (schema.prefixItems) return `[${schema.prefixItems.map(item => typeOf(item, defs, depth + 1)).join(', ')}]`
    return `${wrap(typeOf(schema.items ?? {}, defs, depth + 1))}[]${schema.maxItems ? ` (≤${schema.maxItems})` : ''}`
  }
  if (type === 'object' || schema.properties) {
    if (schema.properties) {
      const required = new Set(schema.required ?? [])
      return `{ ${Object.entries(schema.properties).map(([key, value]) => `${key}${required.has(key) ? '' : '?'}: ${typeOf(value, defs, depth + 1)}`).join(', ')} }`
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') return `Record<string, ${typeOf(schema.additionalProperties, defs, depth + 1)}>`
    return 'object'
  }
  return type ?? 'any'
}

const wrap = text => (text.includes(' | ') ? `(${text})` : text)

function renderAll() {
  const { byFile, uncovered } = entriesByDomain()
  if (uncovered.length) fail(`no domain takes ${uncovered.join(', ')}: add its prefix to DOMAINS in scripts/reference-from-registry.mjs`)
  const files = new Map()
  for (const domain of DOMAINS) files.set(domain.file, renderDomain(domain, byFile.get(domain.file)))
  files.set('person-only.md', renderPersonOnly())
  files.set('tools-and-resources.md', renderTools())
  files.set('README.md', renderIndex(byFile))
  return files
}

const files = renderAll()
const summary = `${registry.ops.length} ops and ${registry.doors.length} doors in ${DOMAINS.length} domains, ${registry.personOnly.length} person-only acts, ${registry.tools.length} tools, ${registry.resources.length} resources`
if (args[0] === '--check') {
  const problems = []
  for (const [file, text] of files) {
    const path = join(outDir, file)
    if (!existsSync(path) || readFileSync(path, 'utf8') !== text) problems.push(`stale: reference/operations/${file} (run node scripts/reference-from-registry.mjs)`)
  }
  for (const file of existsSync(outDir) ? readdirSync(outDir) : []) if (!files.has(file)) problems.push(`stray: reference/operations/${file}`)
  if (problems.length) fail(problems.join('\n'))
  console.log(`reference up to date: ${summary}`)
} else {
  mkdirSync(outDir, { recursive: true })
  for (const file of readdirSync(outDir)) if (!files.has(file)) rmSync(join(outDir, file))
  for (const [file, text] of files) writeFileSync(join(outDir, file), text)
  console.log(`wrote ${files.size} files: ${summary}`)
}
