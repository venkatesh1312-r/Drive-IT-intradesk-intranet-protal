import ollama from 'ollama'
import { validateInput } from './python_bridge.js'

const LLM_MODEL = process.env.OLLAMA_LLM_MODEL || 'llama3.2'
// Keep the model resident in memory between requests so we don't pay the
// cold model-load cost on every question. Shared by all Ollama calls.
export const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || '30m'

// ── Guardrails circuit breaker ─────────────────────────────────────────────
// The optional Python guardrails service is frequently not running. Without
// this, every question waits the full validateInput timeout before failing
// open. Once it fails, we skip it for a cooldown window instead of blocking.
const GUARDRAILS_COOLDOWN_MS = 2 * 60 * 1000
let guardrailsDownUntil = 0

// ── Greeting response pools ───────────────────────────────────────────────────
const GREETING_RESPONSES = [
  'Hello! How can I assist you with company policies today?',
  'Hi there! Feel free to ask me anything about our company policies.',
  "Hey! I'm here to help you with any company policy questions.",
  'Hello! What would you like to know about our company policies?',
]
const THANKS_RESPONSES = [
  "You're welcome! Let me know if you have any other policy questions.",
  'Happy to help! Feel free to ask anything else.',
  'Glad I could help! Any other policy questions?',
]
const BYE_RESPONSES = [
  'Goodbye! Feel free to come back if you have policy questions.',
  "See you! Don't hesitate to ask if you need anything.",
  'Bye! Have a great day!',
]
const GREETINGS = [
  'hi', 'hii', 'hiii', 'hey', 'hello', 'helo', 'heya', 'howdy', 'sup', 'yo',
  'good morning', 'good evening', 'good night', 'good afternoon',
  'how are you', 'how r u', 'how are u', "how's it going",
  'ok', 'okay', 'cool', 'got it', 'alright',
]
const THANKS = ['thank you', 'thanks', 'ty', 'thx', 'thank u', 'thanks a lot', 'thank you so much']
const BYES = ['bye', 'goodbye', 'see you', 'cya']

export const askLLM = async (context, question, history = [], res, appendNote = '') => {
  const t0 = Date.now()

  const q = question.trim().toLowerCase().replace(/[!?.]+$/, '')

  // ── Step 1: Greeting fast-path (zero external calls) ───────────────────────
  let greetingPool = null
  if (THANKS.includes(q)) greetingPool = THANKS_RESPONSES
  else if (BYES.includes(q)) greetingPool = BYE_RESPONSES
  else if (GREETINGS.includes(q)) greetingPool = GREETING_RESPONSES

  if (greetingPool) {
    const reply = greetingPool[Math.floor(Math.random() * greetingPool.length)]
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.flushHeaders()
    for (const word of reply.split(' ')) {
      res.write(word + ' ')
      await new Promise((r) => setTimeout(r, 30))
    }
    res.end()
    console.log(`[TIMER] Greeting fast-path: ${Date.now() - t0}ms`)
    return reply
  }

  // ── Step 2: Guardrails — optional (fails open + circuit breaker) ───────────
  // Skip entirely during the cooldown window after a recent failure so we
  // don't block every request on a timeout when the service is down.
  if (Date.now() >= guardrailsDownUntil) {
    try {
      const inputCheck = await validateInput(question)
      if (inputCheck && inputCheck.valid === false) {
        res.setHeader('Content-Type', 'application/json')
        res.status(400).json({ success: false, error: inputCheck.message })
        return null
      }
    } catch (err) {
      guardrailsDownUntil = Date.now() + GUARDRAILS_COOLDOWN_MS
      console.warn('[Guardrails] unavailable — skipping for 2m:', err.message)
    }
  }

  // ── Step 3: Streaming headers ──────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.flushHeaders()

  // ── Step 4: System prompt ───────────────────────────────────────────────────
  const systemPrompt = context
    ? `You are an intelligent company policy assistant.
Always interpret user queries even if they contain spelling mistakes, numbers, or casual phrasing.

Base your answer on the CONTEXT below. You may reason over it: connect and combine
related sections, draw the logical conclusion a reasonable reader would, and infer an
answer even when it is not stated word-for-word — as long as the context clearly supports it.
Do NOT invent specific facts (numbers, dates, names, entitlements) that are not in the context.
If the context is truly unrelated to the question, say: "This information is not available in the company policy. For further assistance, please contact HR at hr@company.com"

Be concise — max 4 lines.
At the END of your response add the policy reference like: (Section X. Title)
Example: "Employees must maintain formal attire. (Section 5. Dress Code)"
Never start with a citation. Never cite as a numbered list.

CONTEXT:
${context}`
    : `You are a friendly HR assistant. Reply naturally and helpfully.
Keep your reply short — max 2 lines. Do not mention company policy documents.`

  // ── Step 5: Build messages ──────────────────────────────────────────────────
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: question },
  ]

  // ── Step 6: Stream from Ollama ──────────────────────────────────────────────
  const t2 = Date.now()
  const stream = await ollama.chat({
    model: LLM_MODEL,
    messages,
    stream: true,
    keep_alive: KEEP_ALIVE,
    options: { temperature: 0.2, num_predict: 256 },
  })
  console.log(`[TIMER] Ollama stream init: ${Date.now() - t2}ms`)

  let fullResponse = ''
  for await (const part of stream) {
    const content = part.message?.content || ''
    if (!content) continue
    fullResponse += content
    res.write(content)
  }

  if (appendNote) res.write(appendNote)
  console.log(`[TIMER] TOTAL: ${Date.now() - t0}ms`)
  res.end()

  return fullResponse
}
