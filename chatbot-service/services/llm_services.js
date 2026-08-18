import Groq from 'groq-sdk'
import { validateInput, runGraph } from './python_bridge.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Set DEBUG_TIMERS=true in .env to see per-request timing breakdowns.
// Off by default so every chat request doesn't pay for console I/O.
const DEBUG_TIMERS = process.env.DEBUG_TIMERS === 'true'
const timerLog = (...args) => { if (DEBUG_TIMERS) console.log(...args) }

// ── Greeting response pools ───────────────────────────────────────────────────
const GREETING_RESPONSES = [
  "Hello! How can I assist you with company policies today?",
  "Hi there! Feel free to ask me anything about our company policies.",
  "Hey! I'm here to help you with any company policy questions.",
  "Hello! What would you like to know about our company policies?",
]
const THANKS_RESPONSES = [
  "You're welcome! Let me know if you have any other policy questions.",
  "Happy to help! Feel free to ask anything else.",
  "Glad I could help! Any other policy questions?",
]
const BYE_RESPONSES = [
  "Goodbye! Feel free to come back if you have policy questions.",
  "See you! Don't hesitate to ask if you need anything.",
  "Bye! Have a great day!",
]
const GREETINGS = [
  'hi','hii','hiii','hey','hello','helo','heya','howdy','sup','yo',
  'good morning','good evening','good night','good afternoon',
  'how are you','how r u','how are u',"how's it going",
  'ok','okay','cool','got it','alright',
]
const THANKS = ['thank you','thanks','ty','thx','thank u','thanks a lot','thank you so much']
const BYES   = ['bye','goodbye','see you','cya']

export const askLLM = async (context, question, history = [], res, appendNote = "") => {

  const t0 = Date.now()
  timerLog('\n─────────────────────────────────────')
  timerLog('[TIMER] Request started')

  const q = question.trim().toLowerCase().replace(/[!?.]+$/, '')

  // ── Step 1: Greeting fast-path FIRST (zero external calls) ───────────────
  // MOVED BEFORE guardrails — greetings don't need Python validation.
  // Saves ~100-200ms on every greeting message.
  let greetingPool = null
  if (THANKS.includes(q))         greetingPool = THANKS_RESPONSES
  else if (BYES.includes(q))      greetingPool = BYE_RESPONSES
  else if (GREETINGS.includes(q)) greetingPool = GREETING_RESPONSES

  if (greetingPool) {
    const reply = greetingPool[Math.floor(Math.random() * greetingPool.length)]
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.flushHeaders()
    for (const word of reply.split(' ')) {
      res.write(word + ' ')
      await new Promise(r => setTimeout(r, 30))
    }
    res.end()
    timerLog(`[TIMER] Greeting fast-path: ${Date.now() - t0}ms`)
    return reply
  }

  // ── Step 2: Guardrails — injection + toxic only (non-greetings only) ─────
  // Fails OPEN: if the guardrails microservice is down/unreachable, we log
  // it and let the question through rather than breaking the whole chatbot
  // over an optional safety-net service being unavailable.
  const t1 = Date.now()
  let inputCheck = { valid: true }
  try {
    inputCheck = await validateInput(question)
  } catch (err) {
    console.error('[Input Guard Error] Guardrails unreachable, failing open:', err.message)
  }
  timerLog(`[TIMER] validateInput: ${Date.now() - t1}ms`)

  if (!inputCheck.valid) {
    res.setHeader('Content-Type', 'application/json')
    res.status(400).json({ success: false, error: inputCheck.message })
    return null
  }

  // ── Step 3: Streaming headers ─────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.flushHeaders()

  // ── Step 4: System prompt ─────────────────────────────────────────────────
  const systemPrompt = context
    ? `You are a company policy assistant.
Always interpret user queries even if they contain spelling mistakes, numbers, or casual phrasing.
Use ONLY the context below to answer. Do not use any outside knowledge.
If the answer is not found in the context, say: "This information is not available in the company policy. For further assistance, please contact HR at hr@company.com"
Be concise — max 4 lines.
At the END of your response add the policy reference like: (Section X. Title)
Example: "Employees must maintain formal attire. (Section 5. Dress Code)"
Never start with a citation. Never cite as a numbered list.

CONTEXT:
${context}`
    : `You are a friendly HR assistant. Reply naturally and helpfully.
Keep your reply short — max 2 lines. Do not mention company policy documents.`

  // ── Step 5: Build messages ────────────────────────────────────────────────
  // history here is already filtered by chat_controller (0 or 2 messages)
  // based on whether the previous exchange is relevant to the current question
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: question }
  ]

  // ── Step 6: Stream from Groq ──────────────────────────────────────────────
  const t2 = Date.now()
  const stream = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages,
    stream: true,
    temperature: 0.1,
    max_tokens: 400
  })
  timerLog(`[TIMER] Groq stream init: ${Date.now() - t2}ms`)

  let firstChunk = true
  let fullResponse = ''
  const t3 = Date.now()

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || ''
    if (!content) continue
    if (firstChunk) {
      timerLog(`[TIMER] First token: ${Date.now() - t3}ms`)
      firstChunk = false
    }
    fullResponse += content
    res.write(content)
  }

  // Append HR note if needed (3rd consecutive same topic)
  if (appendNote) res.write(appendNote)

  timerLog(`[TIMER] Stream done: ${Date.now() - t3}ms`)
  timerLog(`[TIMER] TOTAL: ${Date.now() - t0}ms`)
  res.end()

  // ── Step 7: Output guard in background (unchanged) ───────────────────────
  setImmediate(async () => {
    try {
      const graphResult = await runGraph(question, context, history, fullResponse)
      if (graphResult.blocked) {
        console.warn('[Output Guard] Blocked:', question)
      }
    } catch (err) {
      console.error('[Output Guard Error]:', err.message)
    }
  })

  return fullResponse
}
