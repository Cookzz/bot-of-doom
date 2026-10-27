import { createCanvas, type SKRSContext2D, } from '@napi-rs/canvas'
import type { BossLetter, BossmapBundle, BossEvent } from '../types/bossmap.type'

/* Cell size of the rendered map, in pixels */
const CELL = 20

const BG_COLOR = '#101010'
const GRID_LINE = '#1c1c1c'
const TEXT_COLOR = '#ffffff'
/* Colors lifted from dfprofiler's own stylesheets */
const PREBOSS_COLOR = 'cyan'            /* .preboss{color:cyan!important} */
const OLD_COLOR = '#32cd32'             /* .oldboss{color:#32cd32!important} */
const MISSION_BORDER = 'red'            /* #boss-table .mission{border+outline red} */
const QRF_BORDER = 'green'              /* #boss-table .qrf{border+outline green} */
const GAMEEVENT_BORDER = 'blue'         /* #boss-table .gameevent{border+outline blue} */
const DHIC_COLOR = 'red'                /* .dhIC flashing red */

export type BossMarker = {
  x: number
  y: number
  label: string
  /* site's span color for the letter */
  textColor: string
  /* site's cell border color (mission red / qrf green / gameevent blue), if any */
  borderColor: string
}

export type BossListing = {
  label: string
  preboss: boolean
  name: string
  started: boolean
  startTime?: number
  endTime?: number
  locations: string[]
}

/*
  One shared walk over the events, replicating DFProfiler's bossmap.js exactly:
    - counters {om,cb,pb,oi,ci,pi,om,cm,pm}; letter = <letter>+counter.toString(36).toUpperCase()
    - missions get M + cm (started) / pm (not started)
    - bosses: Bandits -> B, others -> I, with separate cb/pb and ci/pi counters
    - location [3000,3000] => label "OS" (no counter, and it sticks for the whole event)
    - ended events are skipped entirely (we don't render oldboss)
    - qrf/qrfdr => delta glyph, unknown gameevent => omega glyph
    - isoa=1 => outpost attack highlight
  Both the canvas render and the embed listing consume this so labels always match.
*/
const buildBossMarkers = (bundle: BossmapBundle) => {
  const counters = { cb: 0, pb: 0, ci: 0, pi: 0, cm: 0, pm: 0 }
  const counterLabel = (n: number) => n.toString(36).toUpperCase()

  const markers: BossMarker[] = []
  const listings: BossListing[] = []

  let eventCount = 0
  for (const event of bundle.events) {
    /* skip ended events and preboss (not started) events entirely */
    if (event.ended === '1' || event.started !== '1') continue
    eventCount++

    const started = true

    if (event.isoa === '1') {
      /* outpost attack: highlight every listed outpost cell (site: .classList.add("outpostAttack")) */
      for (const loc of event.locations) {
        markers.push({
          x: Number(loc[0]), y: Number(loc[1]),
          label: '', textColor: 'white', borderColor: 'red',
        })
      }
      eventCount--
      continue
    }

    if (event.need_briefing === '1') {
      const label = 'M' + counterLabel(started ? ++counters.cm : ++counters.pm)
      listings.push({
        label, preboss: !started, name: (event.title ?? '').replace(/&Delta;/g, '').trim() || 'Mission',
        started,
        startTime: event.start_time ? Number(event.start_time) : undefined,
        endTime: event.end_time ? Number(event.end_time) : undefined,
        locations: event.locations.map((l) => `${l[0]},${l[1]}`).filter((xy) => !xy.includes('3000')),
      })
      for (const loc of event.locations) {
        markers.push({
          x: Number(loc[0]), y: Number(loc[1]), label,
          textColor: TEXT_COLOR, borderColor: MISSION_BORDER,
        })
      }
      continue
    }

    if ((event.special_enemy_type ?? '0') !== '0') {
      /* "l" persists across the event's locations, exactly like the site's var l */
      let label = ''
      const listed: string[] = []
      for (const loc of event.locations) {
        const x = Number(loc[0]), y = Number(loc[1])
        if (x === 3000 && y === 3000) {
          /* site: if "3000"===s[0]&&"3000"===s[1], l="OS" — with no counter */
          if (label.length === 0) label = 'OS'
          continue
        }
        if (label.length === 0) {
          const bandit = event.special_enemy_type!.includes('Bandits')
          label = (bandit ? 'B' : 'I') + counterLabel(started ? (bandit ? ++counters.cb : ++counters.ci) : (bandit ? ++counters.pb : ++counters.pi))
        }
        listed.push(`${x},${y}`)
        /* dhIC = Devil Hound (boss_num 1) or Pumpkin Queen, site flashes the letter red */
        const dhic = (event.special_enemy_type === '1 x Devil Hound' && event.boss_num === '1')
          || event.special_enemy_type === '1 x Pumpkin Queen'
        markers.push({
          x, y, label,
          textColor: !started ? PREBOSS_COLOR : dhic ? DHIC_COLOR : TEXT_COLOR,
          borderColor: '',
        })
      }
      listings.push({
        label: label || 'OS', preboss: !started,
        name: event.special_enemy_type!, started,
        startTime: event.start_time ? Number(event.start_time) : undefined,
        endTime: event.end_time ? Number(event.end_time) : undefined,
        locations: listed,
      })
      continue
    }

    if (event.event_type) {
      /* qrf/qrfdr => delta, anything else unknown => omega (site: gameevent) */
      const isQrf = event.event_type === 'qrf' || event.event_type === 'qrfdr'
      const glyph = isQrf ? '\u0394' : '\u03A9'
      const border = isQrf ? QRF_BORDER : GAMEEVENT_BORDER
      const title = (event.title ?? '').trim() || (isQrf ? 'Quick Reaction Force' : 'Unknown GPS')
      listings.push({
        label: glyph, preboss: false, name: title, started,
        startTime: event.start_time ? Number(event.start_time) : undefined,
        endTime: event.end_time ? Number(event.end_time) : undefined,
        locations: event.locations.map((l) => `${l[0]},${l[1]}`).filter((xy) => !xy.includes('3000')),
      })
      for (const loc of event.locations) {
        markers.push({
          x: Number(loc[0]), y: Number(loc[1]), label: glyph,
          textColor: TEXT_COLOR, borderColor: border,
        })
      }
    }
  }

  return { markers, listings, eventCount }
}

const formatDuration = (seconds: number): string => {
  const safeSeconds = seconds > 0 ? seconds : 0
  const days = Math.floor(safeSeconds / 86400)
  const hours = Math.floor((safeSeconds % 86400) / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  return (days > 0 ? `${days}d ` : "") + `${hours}h ${minutes}m`
}

/*
  The generated stylesheet colors walkable terrain per world coordinate.
  Every rule looks like:
    #boss-table .coord.xNNNN.yNNNN,...{background-color:rgba(R,G,B,A);...}
*/
export const parseTerritoryCss = (css: string): Map<string, string> => {
  const colors = new Map<string, string>()

  const blockPattern = /([^{}]+)\{([^{}]*)\}/g
  for (const block of css.matchAll(blockPattern)) {
    // block[0] is the full match; [1] the selector fragment, [2] the declarations
    const fragment = block[1]
    const declarations = block[2]
    if (!fragment?.includes('#boss-table') || !declarations?.includes('background-color')) {
      continue
    }

    const colorMatch = declarations.match(/background-color:\s*(rgba?|hsla?)\([^)]*\)|background-color:\s*(#[\w]+)/)
    if (!colorMatch) continue

    for (const coord of fragment.matchAll(/\.coord\.x(\d+)\.y(\d+)/g)) {
      colors.set(`${coord[1]},${coord[2]}`, colorMatch[0].replace(/^background-color:\s*/, ''))
    }
  }

  return colors
}

/*
  Draws a marker the way the site does: the letter sits on the cell, and the
  whole cell gets a colored border/outline for mission/qrf/gameevent classes
  (#boss-table .mission/.qrf/.gameevent rules).
*/
const drawMarker = (
  ctx: SKRSContext2D,
  x: number, y: number,
  marker: BossMarker,
) => {
  const px = x * CELL
  const py = y * CELL
  const midX = px + CELL / 2
  const midY = py + CELL / 2

  if (marker.borderColor) {
    ctx.strokeStyle = marker.borderColor
    ctx.lineWidth = 2
    ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2)
    /* site also adds an "outline" — simulate the doubled border with a second, wider pass */
    ctx.strokeStyle = marker.borderColor
    ctx.lineWidth = 1
    ctx.strokeRect(px + 3, py + 3, CELL - 6, CELL - 6)
  }
  /* outpost attack flashes red — paint the whole cell since there is no letter */
  if (marker.label === '' && marker.borderColor === 'red') {
    ctx.fillStyle = 'rgba(200,200,200,0.6)'
    ctx.fillRect(px, py, CELL, CELL)
    ctx.strokeStyle = 'red'
    ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1)
    return
  }

  const fontSize = marker.label.length > 2 ? 10 : 13
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = marker.textColor
  ctx.fillText(marker.label, midX, midY + 0.5)
}

export const renderBossMap = (bundle: BossmapBundle): Buffer => {
  const { minX, minY } = bundle.bounds
  const cellCountX = bundle.bounds.maxX - minX + 1
  const cellCountY = bundle.bounds.maxY - minY + 1

  const { markers, listings, eventCount } = buildBossMarkers(bundle)

  const canvas = createCanvas(cellCountX * CELL, cellCountY * CELL)
  const ctx = canvas.getContext('2d')

  // 1. dark base
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 2. terrain colors per coordinate, then faint cell grid
  for (const cell of bundle.cells) {
    const color = bundle.terrains.get(`${cell.x},${cell.y}`)
    if (!color) continue

    ctx.fillStyle = color
    ctx.fillRect((cell.x - minX) * CELL, (cell.y - minY) * CELL, CELL, CELL)
  }

  ctx.strokeStyle = GRID_LINE
  ctx.lineWidth = 1
  for (let gx = 0; gx <= cellCountX; gx++) {
    ctx.beginPath()
    ctx.moveTo(gx * CELL + 0.5, 0)
    ctx.lineTo(gx * CELL + 0.5, canvas.height)
    ctx.stroke()
  }
  for (let gy = 0; gy <= cellCountY; gy++) {
    ctx.beginPath()
    ctx.moveTo(0, gy * CELL + 0.5)
    ctx.lineTo(canvas.width, gy * CELL + 0.5)
    ctx.stroke()
  }

  // 3. static outpost letters
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const letter of bundle.letters) {
    ctx.fillStyle = TEXT_COLOR
    ctx.fillText(letter.letter, (letter.x - minX) * CELL + CELL / 2, (letter.y - minY) * CELL + CELL / 2)
  }

  // 4. live event markers (ended events are excluded inside buildBossMarkers)
  for (const marker of markers) {
    drawMarker(ctx, marker.x - minX, marker.y - minY, marker)
  }

  if (bundle.outpostsAttacked) {
    ctx.fillStyle = 'rgba(146,7,7,0.85)'
    ctx.fillRect(0, 0, canvas.width, 24)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('! ALL OUTPOSTS UNDER ATTACK !', canvas.width / 2, 14)
  }

  // 5. bottom footer, rendered as a strip on the canvas
  const footerHeight = 24
  const heightWithFooter = cellCountY * CELL + footerHeight
  const full = createCanvas(canvas.width, heightWithFooter)
  const fullCtx = full.getContext('2d')

  fullCtx.fillStyle = BG_COLOR
  fullCtx.fillRect(0, 0, full.width, full.height)
  fullCtx.drawImage(canvas, 0, 0)
  fullCtx.font = '12px sans-serif'

  const footerY = interactionFooterOffset(cellCountY)
  fullCtx.textAlign = 'left'
  fullCtx.fillStyle = TEXT_COLOR
  fullCtx.fillText(`Event count: ${eventCount}. Server time: ${new Date(bundle.servertime * 1000).toISOString().slice(0, 16)}Z`, 4, footerY)

  /* faux legend for the embed image, mirroring the site's key */
  const legend = [
    ['M=Mission', MISSION_BORDER],
    ['B=Bandit I=Infection', TEXT_COLOR],
    ['cyan=preboss', PREBOSS_COLOR],
    ['\u0394\u03A9=QRF/Event', TEXT_COLOR],
  ] as [string, string][]
  let legendX = full.width - 4
  for (const [textEntry, color] of [...legend].reverse()) {
    fullCtx.textAlign = 'right'
    fullCtx.fillStyle = color
    fullCtx.fillText(textEntry, legendX, footerY)
    legendX -= fullCtx.measureText(textEntry).width + 12
  }

  return full.toBuffer('image/png')
}

const interactionFooterOffset = (cellCountY: number): number => cellCountY * CELL + 16

/* Common text list used in the embed description, sharing labels with the map */
export const describeBossmapEvents = (bundle: BossmapBundle): string => {
  const { listings } = buildBossMarkers(bundle)
  const lines: string[] = []

  for (const item of listings) {
    let when = ''
    if (!item.started && item.startTime !== undefined) {
      when = `starts in ${formatDuration(item.startTime - bundle.servertime)}`
    } else if (item.endTime !== undefined) {
      when = `ends in ${formatDuration(item.endTime - bundle.servertime)}`
    }

    const place = item.locations.length
      ? (item.locations.length > 3
        ? `${item.locations.slice(0, 3).join(' | ')} (+${item.locations.length - 3} more spawns)`
        : item.locations.join(' | '))
      : 'anywhere (3000 zone)'

    const flag = item.preboss ? ' (preboss)' : ''
    lines.push(`**[ ${item.label}${flag} ]** ${item.name}\n${place} - ${when}`)
  }

  /* outpost attack rows, as the site lists them under "Outpost attacks" */
  if (bundle.events.some(e => e.isoa === '1' && e.ended !== '1')) {
    lines.unshift('**!! ALL OUTPOSTS UNDER ATTACK !!**')
  }

  if (!lines.length) {
    return 'Nothing is currently active on the bossmap.'
  }

  /* Discord embed descriptions cap at 4096 characters — truncate gracefully */
  let text = lines.join('\n')
  while (text.length > 4096) {
    lines.pop()
    if (lines.length) {
      text = lines.join('\n') + '\n…'
    } else {
      text = text.slice(0, 4093) + '…'
    }
  }

  return text
}

/*
  Comprehensive listing for a separate follow-up message, formatted as
  fixed-width tables (rendered inside Discord code blocks).
  Returns message chunks, each within Discord's 2000-character limit.
*/
export const formatBossTables = (bundle: BossmapBundle): string[] => {
  const { listings, eventCount } = buildBossMarkers(bundle)

  const pad = (value: string, width: number, alignRight = false) => {
    const clean = value.length > width ? value.slice(0, width - 1) + '…' : value
    return alignRight ? clean.padStart(width) : clean.padEnd(width)
  }

  const statusOf = (item: BossListing): string => {
    if (!item.started && item.startTime !== undefined) {
      return `preboss ${formatDuration(item.startTime - bundle.servertime)}`
    }
    if (item.endTime !== undefined) {
      return `ends ${formatDuration(item.endTime - bundle.servertime)}`
    }
    return item.started ? 'active' : 'preboss'
  }

  /*
    Locations as human direction lines from the nearest outpost ("3D from
    Secronom Bunker"), instead of raw world coordinates.
    U/D/L/R are relative to the outpost; the closest spot of the event is used.
  */
  const parseXY = (s: string): [number, number] => {
    const [x, y] = s.split(',').map(Number)
    return [x, y]
  }

  const OUTPOSTS: { x: number; y: number; name: string }[] = [
    { x: 1000, y: 1000, name: "Nastya's Holdout" },
    { x: 1005, y: 985, name: "Dogg's Stockade" },
    { x: 1032, y: 985, name: 'Camp Valcrest' },
    { x: 1054, y: 987, name: 'Secronom Bunker' },
    { x: 1029, y: 1003, name: 'Fort Pastor' },
    { x: 1012, y: 1019, name: 'Precinct 13' },
    { x: 1058, y: 1019, name: 'Ground Zero' },
  ]

  const describeSpots = (item: BossListing): string => {
    if (!item.locations.length) return 'anywhere in the world (no fixed spawn)'

    let best: { dist: number; dx: number; dy: number; name: string } | null = null
    for (const loc of item.locations) {
      const [x, y] = parseXY(loc)
      for (const post of OUTPOSTS) {
        const dx = x - post.x
        const dy = y - post.y
        const dist = Math.abs(dx) + Math.abs(dy)
        if (!best || dist < best.dist) {
          best = { dist, dx, dy, name: post.name }
        }
      }
    }
    if (!best) return 'anywhere in the world (no fixed spawn)'

    const dirs: string[] = []
    if (best.dy !== 0) dirs.push(`${Math.abs(best.dy)}${best.dy > 0 ? 'D' : 'U'}`)
    if (best.dx !== 0) dirs.push(`${Math.abs(best.dx)}${best.dx > 0 ? 'R' : 'L'}`)
    const dirText = dirs.length ? dirs.join(' ') + ' of ' : 'at '
    const extra = item.locations.length > 1 ? ` (nearest of ${item.locations.length} spots)` : ''
    return `${dirText}${best.name}${extra}`
  }

  const missions = listings.filter(i => i.label.startsWith('M'))
  const bosses = listings.filter(i => i.label.startsWith('B') || i.label.startsWith('I') || i.label === 'OS')
  const special = listings.filter(i => i.label === '\u0394' || i.label === '\u03A9')

  /* one monospaced table, sectioned */
  const parts: string[] = []
  for (const [title, items] of [
    ['Missions (M)', missions],
    ['Bosses (B/I)', bosses],
    ['Special events (Δ = QRF, Ω = GPS)', special],
  ] as [string, BossListing[]][]) {
    if (!items.length) continue
    parts.push(`— ${title} —`)
    for (const item of items) {
      const name = item.name.replace(/&Delta;/g, '').replace(/&[a-z]+;/g, '')
      parts.push(`${pad((item.preboss ? '*' : '') + item.label, 8)}${pad(name, 28)}${pad(statusOf(item), 18)}${describeSpots(item)}`)
    }
  }

  if (bundle.events.some(e => e.isoa === '1' && e.ended !== '1')) {
    parts.unshift('!! ALL OUTPOSTS UNDER ATTACK !!')
  }

  /* wrap in a code block and split at Discord's 2000-character message limit */
  /* soonest = smallest remaining time among active events' end/start timers */
  const remaining = listings
    .map(i => (i.started ? i.endTime : i.startTime) ?? 0)
    .filter(v => v > 0)
    .map(v => v - bundle.servertime)
    .filter(v => v > 0)
  const soonestEnd = remaining.length ? Math.min(...remaining) : 0
  const header = `Bossmap — ${eventCount} active events (soonest ends in ${formatDuration(soonestEnd)})`
  const body = parts.join('\n')
  const chunks: string[] = []
  if (body.length + header.length + 8 <= 2000) {
    chunks.push(`**${header}**\n\`\`\`\n${body}\n\`\`\``)
  } else {
    const lines = body.split('\n')
    let current = `**${header}** (1/x)\n\`\`\`\n`
    let part = 1
    for (const line of lines) {
      if (current.length + line.length + 6 > 1995) {
        chunks.push(current + '\n```')
        part++
        current = `**${header}** (${part}/x)\n\`\`\`\n`
      }
      current += line + '\n'
    }
    if (current.trim().length) chunks.push(current + '\n```')

    const total = chunks.length
    for (let i = 0; i < chunks.length; i++) {
      chunks[i] = chunks[i].replace(/\((\d+)\/x\)/, `($1/${total})`)
    }
  }
  return chunks
}
