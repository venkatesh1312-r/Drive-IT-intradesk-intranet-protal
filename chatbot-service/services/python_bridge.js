// Optional Guardrails microservice bridge. Short timeout so that when the
// Python service is not running the pipeline just skips guardrails (fail-open).
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001'
const TIMEOUT_MS = 1500

async function postJson(path, body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${PYTHON_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Python microservice error (${res.status})`)
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

// { valid: bool, message: string }
export const validateInput = async (question) => postJson('/validate-input', { question })

// { answer: string, blocked: bool }
export const runGraph = async (question, context, history, fullResponse = null) =>
  postJson('/run-graph', { question, context, history, full_response: fullResponse })
