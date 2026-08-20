import { askLLM, CITATION_MARKER } from "../services/llm_services.js"
import vector_search from "../services/vector_search_services.js"
import { getAllSessions, getSessionById, upsertSession, deleteSessionById } from "../services/session_services.js"
import { expandAbbreviations } from "../services/abbreviation_services.js"
import Groq from 'groq-sdk'
import prisma from '../config/prisma.js'

const groq     = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Set DEBUG_TIMERS=true in .env to see per-request classifier/topic/context
// debug output. Off by default so every chat request doesn't pay for console I/O.
const DEBUG_TIMERS = process.env.DEBUG_TIMERS === 'true'
const debugLog = (...args) => { if (DEBUG_TIMERS) console.log(...args) }

const HR_EMAIL = "hr@company.com"
const HR_NOTE  = `\n\nFor further assistance, please contact HR at **${HR_EMAIL}**`
const HR_ONLY  = `For further assistance, please contact HR at **${HR_EMAIL}**`

// ── In-memory stores ──────────────────────────────────────────────
const conversationStore = new Map()
const knownSessions     = new Set()
const topicTracker      = new Map()

const TOPICS = [
  'LEAVE','ATTENDANCE','DRESS_CODE','SALARY','WFH',
  'CONDUCT','HARASSMENT','HEALTH_SAFETY','ONBOARDING',
  'RESIGNATION','PERFORMANCE','TRAVEL','LAPTOP',
  'CONFIDENTIALITY','OTHER'
]

// ── MERGED: Off-topic detector + Topic classifier in ONE LLM call ─
async function classifyQuestion(question) {
  try {
    const result = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      reasoning_effort: 'low',
      messages: [
        {
          role: 'system',
          content:
            `You are a classifier for a company HR policy chatbot. Respond with ONLY a JSON object.\n\n` +
            `Determine:\n` +
            `1. "blocked": true if the question is about coding, programming, math, science, geography, history, entertainment, movies, music, sports, food, news, politics, finance, personal relationships, religion, or anything completely unrelated to a workplace or company. When in doubt → false.\n` +
            `2. "topic": ONE of these: ${TOPICS.join(', ')}\n\n` +
            `Examples:\n` +
            `"how many leaves" -> {"blocked":false,"topic":"LEAVE"}\n` +
            `"write python code" -> {"blocked":true,"topic":"OTHER"}\n` +
            `"can I wear jeans" -> {"blocked":false,"topic":"DRESS_CODE"}\n` +
            `"what is 2+2" -> {"blocked":true,"topic":"OTHER"}\n\n` +
            `Reply ONLY with valid JSON. No explanation.`
        },
        { role: 'user', content: question }
      ],
      temperature: 0,
      max_tokens: 100,
    })
    const raw    = result.choices[0]?.message?.content?.trim() || ''
    debugLog(`[Classifier] raw="${raw}"`)
    const parsed = JSON.parse(raw)
    const topic  = TOPICS.find(t => (parsed.topic || '').toUpperCase().includes(t)) || 'OTHER'
    return { blocked: !!parsed.blocked, topic }
  } catch (e) {
    console.error('[Classifier error]', e.message)
    return { blocked: false, topic: 'OTHER' }
  }
}

// ── PREVIOUS MESSAGE RELEVANCE CHECK ─────────────────────────────
async function isPreviousRelevant(currentQuestion, lastUserMsg, lastBotAnswer) {
  if (!lastBotAnswer || !lastUserMsg) return false
  try {
    const result = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      reasoning_effort: 'low',
      messages: [
        {
          role: 'system',
          content:
            `You decide if a follow-up question is contextually related to a previous answer.\n` +
            `Reply ONLY with YES or NO.\n\n` +
            `Rules:\n` +
            `- YES if the new question uses pronouns/references like "it", "that", "this", "means", "so", "then" pointing to the previous answer\n` +
            `- YES if the new question is a direct follow-up or clarification of the previous topic\n` +
            `- NO if the new question is about a completely different topic\n` +
            `- NO if the new question can stand alone without prior context\n\n` +
            `Previous Q: "${lastUserMsg}"\n` +
            `Previous A: "${lastBotAnswer.slice(0, 300)}"\n` +
            `New Q: "${currentQuestion}"\n\n` +
            `Reply: YES or NO only.`
        }
      ],
      temperature: 0,
      max_tokens: 20,
    })
    const raw = result.choices[0]?.message?.content?.trim().toUpperCase() || ''
    debugLog(`[PrevRelevance] "${raw}"`)
    return raw.includes('YES')
  } catch (e) {
    console.error('[PrevRelevance error]', e.message)
    return false
  }
}

// ── Topic tracker ─────────────────────────────────────────────────
function updateTopicTracker(session_id, newTopic) {
  if (newTopic === 'OTHER') return 0
  const current = topicTracker.get(session_id) || { topic: null, count: 0 }
  if (current.topic === newTopic) {
    const count = current.count + 1
    topicTracker.set(session_id, { topic: newTopic, count })
    return count
  } else {
    topicTracker.set(session_id, { topic: newTopic, count: 1 })
    return 1
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function isSmalltalk(text) {
  const P = [
    /^h+e+l+o+!*$/i, /^h+i+!*$/i, /^hey!*$/i,
    /^good\s*(morning|evening|afternoon|night)$/i,
    /^how are you\??$/i, /^what('?s| is) up\??$/i,
    /^thanks?!*$/i, /^thank you!*$/i,
    /^bye!*$/i, /^good\s*bye!*$/i,
  ]
  return P.some(p => p.test(text.trim()))
}

function streamPlainText(res, text) {
  try {
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.flushHeaders()
    res.write(text)
    res.end()
  } catch (err) {
    // Client already disconnected — nothing to do, caller logic above
    // this (logQuestion, etc.) has already run where relevant.
  }
}

function toUIMessages(llmHistory) {
  return llmHistory.map(m => ({
    role: m.role === 'assistant' ? 'bot' : 'user',
    text: m.content,
  }))
}

// ── emp_id is passed through so each session is scoped to its owner ──
function saveInBackground(session_id, history, emp_id) {
  setImmediate(() => {
    upsertSession(session_id, toUIMessages(history), emp_id).catch(console.error)
  })
}

// ── Log question to DB (fire-and-forget, Prisma instead of raw pg) ────
function logQuestion(question, topic, session_id) {
  prisma.questionLog
    .create({ data: { question, topic, session_id } })
    .catch(err => console.error('[Log error]', err.message))
}

// ── Build a real, page-accurate citation from the actual top-matched
// chunk (never from the model's imagination). Returns null if we don't
// have enough info to link anywhere useful.
const SECTION_RE = /Section\s+(\d+)[.:]?\s*([A-Za-z0-9 ,&'/-]{0,60})?/i
const SECTION_RE_G = /Section\s+(\d+)[.:]?\s*([A-Za-z0-9 ,&'/-]{0,60})?/gi

function formatSection(match) {
  return `Section ${match[1]}${match[2] && match[2].trim() ? '. ' + match[2].trim() : ''}`
}

async function buildCitation(topChunk) {
  if (!topChunk || !topChunk.pd_id) return null

  const chunkText = topChunk.chunk_text || ''
  const page = topChunk.page_number || null

  // 1. Fast path: the answer chunk itself contains a "Section N. Title"
  // heading (works when the chunk starts right at a section boundary).
  const direct = chunkText.match(SECTION_RE)
  if (direct) {
    return { pd_id: topChunk.pd_id, page, section: formatSection(direct) }
  }

  // 2. Common case: the chunk is mid-section, so its heading actually
  // lives earlier in the document (a previous 600-char chunk). Pull the
  // full document text and take the nearest heading that appears BEFORE
  // this chunk, rather than only ever looking inside the answer chunk.
  try {
    const doc = await prisma.policyDoc.findUnique({
      where: { pd_id: topChunk.pd_id },
      select: { full_text: true },
    })
    const fullText = doc?.full_text || ''
    if (fullText && chunkText) {
      const anchor = chunkText.slice(0, 40) // enough to locate uniquely, tolerant of chunk-boundary whitespace diffs
      const idx = fullText.indexOf(anchor)
      const searchWindow = idx > -1 ? fullText.slice(0, idx + chunkText.length) : fullText
      const headings = [...searchWindow.matchAll(SECTION_RE_G)]
      if (headings.length) {
        return { pd_id: topChunk.pd_id, page, section: formatSection(headings[headings.length - 1]) }
      }
    }
  } catch (err) {
    console.error('[buildCitation] full_text lookup failed:', err.message)
  }

  // 3. No heading found anywhere in the document before this point —
  // still return a citation (page-accurate) with no section label; the
  // frontend falls back to a generic "Source policy" label in this case.
  return { pd_id: topChunk.pd_id, page, section: null }
}

// ─── GET /askbot/sessions ─────────────────────────────────────────
export const getSessions = async (req, res) => {
  try {
    const emp_id   = req.user.id
    const sessions = await getAllSessions(emp_id)
    sessions.forEach(s => knownSessions.add(s.id))
    res.json({ success: true, sessions })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// ─── GET /askbot/sessions/:id ─────────────────────────────────────
export const getSession = async (req, res) => {
  try {
    const emp_id  = req.user.id
    const session = await getSessionById(req.params.id, emp_id)
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' })
    res.json({ success: true, session })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// ─── DELETE /askbot/sessions/:id ──────────────────────────────────
export const deleteSession = async (req, res) => {
  try {
    const emp_id = req.user.id
    await deleteSessionById(req.params.id, emp_id)
    conversationStore.delete(req.params.id)
    knownSessions.delete(req.params.id)
    topicTracker.delete(req.params.id)
    res.json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// ─── GET /askbot/most-asked ───────────────────────────────────────
// Same grouped/trend logic as infradesk, ported from raw pg to
// prisma.$queryRawUnsafe (still real SQL against Postgres).
export const getMostAsked = async (req, res) => {
  try {
    const { range = 'month' } = req.query

    const intervalMap = { week: '7 days', month: '30 days', all: '100 years' }
    const interval = intervalMap[range] || '30 days'

    const result = await prisma.$queryRawUnsafe(`
      SELECT
        q1.topic,
        COUNT(*)::int AS hits,
        (
          SELECT q2.question FROM question_logs q2
          WHERE q2.topic = q1.topic
            AND q2.asked_at >= NOW() - INTERVAL '${interval}'
          ORDER BY q2.asked_at DESC
          LIMIT 1
        ) AS question,
        ARRAY(
          SELECT DISTINCT q3.question FROM question_logs q3
          WHERE q3.topic = q1.topic
            AND q3.asked_at >= NOW() - INTERVAL '${interval}'
          LIMIT 5
        ) AS sample_questions,
        COUNT(*) FILTER (WHERE asked_at >= NOW() - INTERVAL '7 days')::int  AS hits_this_week,
        COUNT(*) FILTER (WHERE asked_at >= NOW() - INTERVAL '14 days'
                           AND asked_at <  NOW() - INTERVAL '7 days')::int  AS hits_last_week
      FROM question_logs q1
      WHERE asked_at >= NOW() - INTERVAL '${interval}'
        AND topic != 'OTHER'
      GROUP BY q1.topic
      ORDER BY hits DESC
      LIMIT 5
    `)

    const rows = result.map((row, i) => {
      const thisWeek = row.hits_this_week || 0
      const lastWeek = row.hits_last_week || 0
      let trendLabel = '+0%'
      if (lastWeek > 0) {
        const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
        trendLabel = (pct >= 0 ? '+' : '') + pct + '%'
      } else if (thisWeek > 0) {
        trendLabel = '+100%'
      }
      return {
        rank:             i + 1,
        topic:            row.topic,
        question:         row.question,
        sample_questions: row.sample_questions || [],
        hits:             row.hits,
        trend:            trendLabel,
        trending_up:      thisWeek >= lastWeek,
      }
    })

    res.json({ success: true, rows })
  } catch (err) {
    console.error('[most-asked error]', err)
    res.status(500).json({ success: false, error: err.message })
  }
}

// ─── POST /askbot ─────────────────────────────────────────────────
const askQuestion = async (req, res) => {
  try {
    const { question, session_id = 'default' } = req.body
    const emp_id = req.user.id                          // ← scoped to logged-in user

    // ── Load history ──────────────────────────────────────────────
    if (!conversationStore.has(session_id)) {
      if (knownSessions.has(session_id)) {
        const saved = await getSessionById(session_id, emp_id)
        if (saved?.messages?.length) {
          const llmHistory = saved.messages
            .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))
            .slice(-10)
          conversationStore.set(session_id, llmHistory)
        } else {
          conversationStore.set(session_id, [])
        }
      } else {
        conversationStore.set(session_id, [])
      }
    }

    const history = conversationStore.get(session_id)

    // ── Safety-net save: persist the question immediately, before we
    // even generate a reply. If the tab is closed/refreshed mid-answer,
    // the question itself is never lost — only the (still-being-typed)
    // answer would be, and that gets saved properly once generation
    // finishes below (llm_services.js keeps generating even if the
    // client already left, precisely so this save still happens).
    saveInBackground(session_id, [...history, { role: 'user', content: question }], emp_id)
    knownSessions.add(session_id)

    // ── Smalltalk ─────────────────────────────────────────────────
    if (isSmalltalk(question)) {
      const assistantReply = await askLLM("", question, history.slice(-4), res)
      if (assistantReply) {
        history.push({ role: 'user', content: question })
        history.push({ role: 'assistant', content: assistantReply })
        if (history.length > 10) history.splice(0, 2)
        conversationStore.set(session_id, history)
        knownSessions.add(session_id)
        saveInBackground(session_id, history, emp_id)   // ← emp_id passed
      }
      return
    }

    // ── Extract last exchange ─────────────────────────────────────
    const lastUserMsg   = history.length >= 2 ? history[history.length - 2]?.content : null
    const lastBotAnswer = history.length >= 1 ? history[history.length - 1]?.content : null

    // ── Expand known shortcuts (CL, EL, WFH, ...) before classifying or
    // searching, so "what is cl and el" actually retrieves the Casual
    // Leave / Earned Leave chunks. The map is auto-built from whatever
    // "Full Term (ABBR)" patterns exist in uploaded PDFs — see
    // abbreviation_services.js — so it grows with new policy docs
    // without any code change.
    const expandedQuestion = await expandAbbreviations(question)
    debugLog(`[Abbrev] "${question}" -> "${expandedQuestion}"`)

    // ── Run in parallel ───────────────────────────────────────────
    const [classification, chunks, prevIsRelevant] = await Promise.all([
      classifyQuestion(expandedQuestion),
      vector_search(expandedQuestion),
      isPreviousRelevant(question, lastUserMsg, lastBotAnswer),
    ])

    const { blocked, topic } = classification

    // ── Off-topic → block (do NOT log) ───────────────────────────
    if (blocked) {
      streamPlainText(res, "Your question is not related to company policy. I can only assist with HR and workplace policy questions.")
      return
    }

    // ── Resolve topic using conversation context ──────────────────
    const resolvedTopic = prevIsRelevant
      ? (topicTracker.get(session_id)?.topic || topic)
      : topic

    debugLog(`[Topic] classified="${topic}" resolved="${resolvedTopic}" (followUp=${prevIsRelevant})`)

    // ── Log valid question to DB ──────────────────────────────────
    logQuestion(question, resolvedTopic, session_id)

    // ── Streak ────────────────────────────────────────────────────
    const count = prevIsRelevant
      ? (topicTracker.get(session_id)?.count ?? 0)
      : updateTopicTracker(session_id, resolvedTopic)

    debugLog(`[Streak] ${resolvedTopic} x ${count} (followUp=${prevIsRelevant})`)

    // ── 4th+ same topic → HR only ─────────────────────────────────
    if (count >= 4) {
      streamPlainText(res, HR_ONLY)
      return
    }

    // ── No chunks ─────────────────────────────────────────────────
    if (!chunks || chunks.length === 0) {
      streamPlainText(res, `This information is not available in the company policy.${HR_NOTE}`)
      return
    }

    // ── Build context-aware history ───────────────────────────────
    const contextualHistory = prevIsRelevant ? history.slice(-2) : []
    debugLog(`[Context] prevIsRelevant=${prevIsRelevant} -> sending ${contextualHistory.length} history messages`)

    // ── RAG answer ────────────────────────────────────────────────
    const context        = chunks.slice(0, 3).map(c => c.chunk_text).join('\n')
    const noteToAppend   = (!prevIsRelevant && count === 3) ? HR_NOTE : ""
    const citation        = await buildCitation(chunks[0])
    const assistantReply = await askLLM(context, question, contextualHistory, res, noteToAppend, citation)

    if (assistantReply) {
      // Same suffix, same order, as what was actually streamed to the
      // client in llm_services.js (answer -> HR note -> citation), so a
      // reopened session renders identically to what was live-streamed.
      const isNotAvailable = assistantReply.includes('This information is not available in the company policy')
      const citationSuffix = (citation && !isNotAvailable)
        ? CITATION_MARKER + JSON.stringify(citation)
        : ""

      history.push({ role: 'user', content: question })
      history.push({ role: 'assistant', content: assistantReply + noteToAppend + citationSuffix })
      if (history.length > 10) history.splice(0, 2)
      conversationStore.set(session_id, history)
      knownSessions.add(session_id)
      saveInBackground(session_id, history, emp_id)     // ← emp_id passed
    }

  } catch (error) {
    console.error(error)
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message })
    } else {
      res.end()
    }
  }
}

export default askQuestion