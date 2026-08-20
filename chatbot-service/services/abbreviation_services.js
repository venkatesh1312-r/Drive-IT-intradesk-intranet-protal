import prisma from '../config/prisma.js'

// ── Auto-extract abbreviations from a policy document's text ───────────
// Looks for the standard "Full Term (ABBR)" pattern that HR policy PDFs
// almost always use to introduce a shortcut, e.g.:
//   "Casual Leave (CL)", "Earned Leave (EL)", "Work From Home (WFH)"
// This means we never hardcode a fixed list — whatever abbreviations a
// PDF actually defines get picked up automatically at upload time, and
// the bot understands them from then on.
const PATTERN = /([A-Z][A-Za-z]+(?:\s+[A-Z&][A-Za-z]*){0,4})\s*\(([A-Z]{2,6})\)/g

export function extractAbbreviations(text) {
  const found = new Map() // abbr -> full_term (first occurrence wins)
  let match
  PATTERN.lastIndex = 0
  while ((match = PATTERN.exec(text)) !== null) {
    const full_term = match[1].trim()
    const abbr = match[2].trim()
    // Skip noise: abbreviation must not just be the initials of a single
    // short word, and full term shouldn't itself basically be the abbr.
    if (abbr.length < 2 || full_term.length < 4) continue
    if (!found.has(abbr)) found.set(abbr, full_term)
  }
  return [...found.entries()].map(([abbr, full_term]) => ({ abbr, full_term }))
}

export async function saveAbbreviations(pd_id, text) {
  const pairs = extractAbbreviations(text)
  if (pairs.length === 0) return []

  await Promise.all(
    pairs.map((p) =>
      prisma.policyAbbreviation
        .upsert({
          where: { abbr_full_term: { abbr: p.abbr, full_term: p.full_term } },
          update: { pd_id },
          create: { abbr: p.abbr, full_term: p.full_term, pd_id },
        })
        .catch((err) => console.error('[Abbreviation save error]', p.abbr, err.message)),
    ),
  )
  return pairs
}

// ── In-memory cache of the abbreviation map, refreshed periodically so
// every chat request doesn't hit the DB. New uploads take effect within
// CACHE_TTL_MS without a redeploy. ─────────────────────────────────────
const CACHE_TTL_MS = 60_000
let cache = { map: new Map(), loadedAt: 0 }

async function getAbbreviationMap() {
  const now = Date.now()
  if (now - cache.loadedAt < CACHE_TTL_MS && cache.map.size > 0) return cache.map

  try {
    const rows = await prisma.policyAbbreviation.findMany({
      select: { abbr: true, full_term: true },
    })
    const map = new Map()
    for (const row of rows) {
      // Same abbr defined in multiple PDFs -> keep all full terms.
      const existing = map.get(row.abbr.toUpperCase()) || []
      if (!existing.includes(row.full_term)) existing.push(row.full_term)
      map.set(row.abbr.toUpperCase(), existing)
    }
    cache = { map, loadedAt: now }
  } catch (err) {
    console.error('[Abbreviation cache load error]', err.message)
  }
  return cache.map
}

// ── Expand shortcuts found in a user question ───────────────────────────
// "what is cl and el" -> "what is cl (Casual Leave) and el (Earned Leave)"
// This is purely additive (original wording kept) so it's safe to feed
// both to the classifier and to the embedding model.
export async function expandAbbreviations(question) {
  const map = await getAbbreviationMap()
  if (map.size === 0) return question

  let expanded = question
  // Match whole-word tokens only (so "cleared" doesn't match "CL").
  const tokens = question.match(/\b[a-zA-Z]{2,6}\b/g) || []
  const seen = new Set()

  for (const token of tokens) {
    const key = token.toUpperCase()
    if (seen.has(key)) continue
    const fullTerms = map.get(key)
    if (!fullTerms) continue
    seen.add(key)
    const re = new RegExp(`\\b${token}\\b`, 'gi')
    expanded = expanded.replace(re, (m) => `${m} (${fullTerms.join(' / ')})`)
  }

  return expanded
}
