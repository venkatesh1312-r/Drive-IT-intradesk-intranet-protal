import ollama from 'ollama'
import { askLLM, KEEP_ALIVE } from '../services/llm_services.js'
import vector_search from '../services/vector_search_services.js'
import {
  getAllSessions,
  getSessionById,
  upsertSession,
  deleteSessionById,
} from '../services/session_services.js'
import prisma from '../config/prisma.js'

const LLM_MODEL = process.env.OLLAMA_LLM_MODEL || 'llama3.2'
const HR_EMAIL = 'hr@company.com'
const HR_NOTE = `\n\nFor further assistance, please contact HR at **${HR_EMAIL}**`
const HR_ONLY = `For further assistance, please contact HR at **${HR_EMAIL}**`

// ── In-memory stores (per-process) ─────────────────────────────────
const conversationStore = new Map()
const knownSessions = new Set()
const topicTracker = new Map()

const TOPICS = [
  'LEAVE', 'ATTENDANCE', 'DRESS_CODE', 'SALARY', 'WFH',
  'CONDUCT', 'HARASSMENT', 'HEALTH_SAFETY', 'ONBOARDING',
  'RESIGNATION', 'PERFORMANCE', 'TRAVEL', 'LAPTOP',
  'CONFIDENTIALITY', 'OTHER',
]

// ── Combined analyzer: off-topic + topic + follow-up in ONE Ollama call ──
// Merging what used to be two separate model calls halves the pre-answer
// latency on the critical path.
async function analyzeQuestion(question, lastUserMsg, lastBotAnswer) {
  const hasPrev = !!(lastUserMsg && lastBotAnswer)
  try {
    const result = await ollama.chat({
      model: LLM_MODEL,
      stream: false,
      format: 'json',
      keep_alive: KEEP_ALIVE,
      options: { temperature: 0, num_predict: 60 },
      messages: [
        {
          role: 'system',
          content:
            `You are a classifier for a company HR policy chatbot. Respond with ONLY a JSON object with keys "blocked", "topic", "follow_up".\n\n` +
            `1. "blocked": true if the question is about coding, programming, math, science, geography, history, entertainment, movies, music, sports, food, news, politics, finance, personal relationships, religion, or anything completely unrelated to a workplace or company. When in doubt → false.\n` +
            `2. "topic": ONE of these: ${TOPICS.join(', ')}\n` +
            `3. "follow_up": true if the new question is a contextual follow-up/clarification of the previous answer (uses "it", "that", "this", "so", "then", or continues the same topic); false if it stands alone or changes topic.\n\n` +
            `Examples:\n` +
            `"how many leaves" → {"blocked":false,"topic":"LEAVE","follow_up":false}\n` +
            `"write python code" → {"blocked":true,"topic":"OTHER","follow_up":false}\n` +
            `"what about sick leave?" (after a leave answer) → {"blocked":false,"topic":"LEAVE","follow_up":true}\n\n` +
            `Reply ONLY with valid JSON. No explanation.`,
        },
        {
          role: 'user',
          content: hasPrev
            ? `Previous Q: "${lastUserMsg}"\nPrevious A: "${lastBotAnswer.slice(0, 300)}"\nNew question: "${question}"`
            : question,
        },
      ],
    })
    const raw = result.message?.content?.trim() || '{}'
    const parsed = JSON.parse(raw)
    const topic = TOPICS.find((t) => (parsed.topic || '').toUpperCase().includes(t)) || 'OTHER'
    return { blocked: !!parsed.blocked, topic, followUp: hasPrev && !!parsed.follow_up }
  } catch (e) {
    console.error('[Analyzer error]', e.message)
    return { blocked: false, topic: 'OTHER', followUp: false } // fail open
  }
}

// ── Topic tracker ───────────────────────────────────────────────────
function updateTopicTracker(session_id, newTopic) {
  if (newTopic === 'OTHER') return 0
  const current = topicTracker.get(session_id) || { topic: null, count: 0 }
  if (current.topic === newTopic) {
    const count = current.count + 1
    topicTracker.set(session_id, { topic: newTopic, count })
    return count
  }
  topicTracker.set(session_id, { topic: newTopic, count: 1 })
  return 1
}

// ── Helpers ─────────────────────────────────────────────────────────
function isSmalltalk(text) {
  const P = [
    /^h+e+l+o+!*$/i, /^h+i+!*$/i, /^hey!*$/i,
    /^good\s*(morning|evening|afternoon|night)$/i,
    /^how are you\??$/i, /^what('?s| is) up\??$/i,
    /^thanks?!*$/i, /^thank you!*$/i,
    /^bye!*$/i, /^good\s*bye!*$/i,
  ]
  return P.some((p) => p.test(text.trim()))
}

function streamPlainText(res, text) {
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.flushHeaders()
  res.write(text)
  res.end()
}

function toUIMessages(llmHistory) {
  return llmHistory.map((m) => ({
    role: m.role === 'assistant' ? 'bot' : 'user',
    text: m.content,
  }))
}

function saveInBackground(session_id, history, emp_id) {
  setImmediate(() => {
    upsertSession(session_id, toUIMessages(history), emp_id).catch(console.error)
  })
}

function logQuestion(question, topic, session_id) {
  prisma.questionLog
    .create({ data: { question, topic, session_id } })
    .catch((err) => console.error('[Log error]', err.message))
}

// ─── GET /askbot/sessions ───────────────────────────────────────────
export const getSessions = async (req, res) => {
  try {
    const emp_id = req.user.id
    const sessions = await getAllSessions(emp_id)
    sessions.forEach((s) => knownSessions.add(s.id))
    res.json({ success: true, sessions })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// ─── GET /askbot/sessions/:id ───────────────────────────────────────
export const getSession = async (req, res) => {
  try {
    const emp_id = req.user.id
    const session = await getSessionById(req.params.id, emp_id)
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' })
    res.json({ success: true, session })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// ─── DELETE /askbot/sessions/:id ────────────────────────────────────
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

// ─── GET /askbot/most-asked ─────────────────────────────────────────
// Groups by TOPIC. SQLite-safe (computed in JS instead of SQL intervals).
export const getMostAsked = async (req, res) => {
  try {
    const { range = 'month' } = req.query
    const daysMap = { week: 7, month: 30, all: 36500 }
    const days = daysMap[range] || 30
    const since = new Date(Date.now() - days * 86400000)
    const weekAgo = new Date(Date.now() - 7 * 86400000)
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000)

    const logs = await prisma.questionLog.findMany({
      where: { asked_at: { gte: since }, NOT: { topic: 'OTHER' } },
      select: { question: true, topic: true, asked_at: true },
      orderBy: { asked_at: 'desc' },
    })

    const byTopic = new Map()
    for (const log of logs) {
      const t = log.topic || 'OTHER'
      if (!byTopic.has(t)) byTopic.set(t, [])
      byTopic.get(t).push(log)
    }

    const rows = [...byTopic.entries()]
      .map(([topic, items]) => {
        const thisWeek = items.filter((i) => i.asked_at >= weekAgo).length
        const lastWeek = items.filter((i) => i.asked_at >= twoWeeksAgo && i.asked_at < weekAgo).length
        let trend = '+0%'
        if (lastWeek > 0) {
          const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
          trend = (pct >= 0 ? '+' : '') + pct + '%'
        } else if (thisWeek > 0) {
          trend = '+100%'
        }
        return {
          topic,
          question: items[0].question,
          sample_questions: [...new Set(items.map((i) => i.question))].slice(0, 5),
          hits: items.length,
          trend,
          trending_up: thisWeek >= lastWeek,
        }
      })
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 5)
      .map((r, i) => ({ rank: i + 1, ...r }))

    res.json({ success: true, rows })
  } catch (err) {
    console.error('[most-asked error]', err)
    res.status(500).json({ success: false, error: err.message })
  }
}

// ─── POST /askbot ───────────────────────────────────────────────────
const askQuestion = async (req, res) => {
  try {
    const { question, session_id = 'default' } = req.body
    const emp_id = req.user.id // scoped to logged-in user

    // ── Load history ──────────────────────────────────────────────
    if (!conversationStore.has(session_id)) {
      if (knownSessions.has(session_id)) {
        const saved = await getSessionById(session_id, emp_id)
        if (saved?.messages?.length) {
          const llmHistory = saved.messages
            .map((m) => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))
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

    // ── Smalltalk ─────────────────────────────────────────────────
    if (isSmalltalk(question)) {
      const assistantReply = await askLLM('', question, history.slice(-4), res)
      if (assistantReply) {
        history.push({ role: 'user', content: question })
        history.push({ role: 'assistant', content: assistantReply })
        if (history.length > 10) history.splice(0, 2)
        conversationStore.set(session_id, history)
        knownSessions.add(session_id)
        saveInBackground(session_id, history, emp_id)
      }
      return
    }

    // ── Extract last exchange ─────────────────────────────────────
    const lastUserMsg = history.length >= 2 ? history[history.length - 2]?.content : null
    const lastBotAnswer = history.length >= 1 ? history[history.length - 1]?.content : null

    // ── Run in parallel ───────────────────────────────────────────
    const [analysis, chunks] = await Promise.all([
      analyzeQuestion(question, lastUserMsg, lastBotAnswer),
      vector_search(question),
    ])

    const { blocked, topic, followUp: prevIsRelevant } = analysis

    // ── Off-topic → block (do NOT log) ────────────────────────────
    if (blocked) {
      streamPlainText(res, 'Your question is not related to company policy. I can only assist with HR and workplace policy questions.')
      return
    }

    // ── Resolve topic using conversation context ──────────────────
    const resolvedTopic = prevIsRelevant ? topicTracker.get(session_id)?.topic || topic : topic

    logQuestion(question, resolvedTopic, session_id)

    // ── Streak ────────────────────────────────────────────────────
    const count = prevIsRelevant
      ? topicTracker.get(session_id)?.count ?? 0
      : updateTopicTracker(session_id, resolvedTopic)

    // ── 4th+ same topic → HR only ─────────────────────────────────
    if (count >= 4) {
      streamPlainText(res, HR_ONLY)
      return
    }

    // ── No chunks → not available in policy ───────────────────────
    if (!chunks || chunks.length === 0) {
      streamPlainText(res, `This information is not available in the company policy.${HR_NOTE}`)
      return
    }

    // ── Build context-aware history ───────────────────────────────
    const contextualHistory = prevIsRelevant ? history.slice(-2) : []

    // ── RAG answer ────────────────────────────────────────────────
    // Pass more chunks so the model has related sections to reason across
    // and link, not just the single closest match.
    const context = chunks.slice(0, 5).map((c) => c.chunk_text).join('\n\n')
    const noteToAppend = !prevIsRelevant && count === 3 ? HR_NOTE : ''
    const assistantReply = await askLLM(context, question, contextualHistory, res, noteToAppend)

    if (assistantReply) {
      history.push({ role: 'user', content: question })
      history.push({ role: 'assistant', content: assistantReply + noteToAppend })
      if (history.length > 10) history.splice(0, 2)
      conversationStore.set(session_id, history)
      knownSessions.add(session_id)
      saveInBackground(session_id, history, emp_id)
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
