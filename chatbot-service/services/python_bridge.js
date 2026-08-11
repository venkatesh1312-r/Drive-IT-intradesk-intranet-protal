const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'

// Calls Guardrails AI to validate user input
export const validateInput = async (question) => {
  const res = await fetch(`${PYTHON_SERVICE_URL}/validate-input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  })
  if (!res.ok) throw new Error('Python microservice error on input validation')
  return res.json() // { valid: bool, message: string }
}

// Calls LangGraph to get the LLM answer with output validation
export const runGraph = async (question, context, history, fullResponse = null) => {
  const res = await fetch(`${PYTHON_SERVICE_URL}/run-graph`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      context,
      history,
      full_response: fullResponse  // null during pre-check, filled after stream ends
    })
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Python microservice error on run-graph')
  }
  return res.json() // { answer: string, blocked: bool }
}