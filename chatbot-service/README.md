# Chatbot Service (sidecar)

An internal **HR policy chatbot** using RAG (Retrieval-Augmented Generation). It answers
employee questions grounded in uploaded company policy PDFs.

This is a self-contained **sidecar** service for the DriveIT intranet portal. It runs as its
own process next to the NestJS backend and shares the same login token, so users don't log in
twice. The chat UI lives in the Next.js app under the **"AI Assistant"** nav item.

## What changed vs. the original prototype

The upstream prototype (`venkatesh1312-r/chatbot_prototype`) required Groq, pgvector, and a
Python microservice. This integration keeps the **exact same pipeline and logic** but swaps the
external dependencies for what runs locally with only **Ollama**:

| Concern | Original | Here |
|---|---|---|
| LLM | Groq API (`gpt-oss-120b`) | Ollama local (`OLLAMA_LLM_MODEL`) |
| Embeddings | Ollama `nomic-embed-text` | same |
| Vector search | Postgres + pgvector | in-memory cosine similarity in JS |
| Storage | Postgres | self-contained SQLite (`chatbot.db`) |
| Guardrails | Python FastAPI (required) | optional — fails open if not running |
| Auth | own cookie JWT | validates the portal's `Authorization: Bearer` token (shared `JWT_SECRET`) |

The RAG flow is unchanged: greeting fast-path → classify (off-topic + topic) → vector search →
context-aware LLM answer (streamed) → topic-streak HR escalation.

## Prerequisites

- Node.js >= 18
- [Ollama](https://ollama.com) running locally:
  ```
  ollama serve
  ollama pull nomic-embed-text     # embeddings (required for RAG)
  ollama pull llama3.2             # a chat model (phi3:mini also works)
  ```

## Setup

```bash
cd chatbot-service
cp .env.example .env      # already matches the backend JWT secret
npm install
npx prisma db push        # creates chatbot.db (SQLite)
npm start                 # http://localhost:4000
```

`.env` note: `OLLAMA_LLM_MODEL` must be a model you've pulled. `JWT_SECRET` must match
`backend/.env` so the portal login token validates here.

## Loading policy documents

The bot only answers from uploaded PDFs. Upload one (as a logged-in admin token):

```bash
curl -X POST http://localhost:4000/policy_upload \
  -H "Authorization: Bearer <portal-token>" \
  -F "pdf=@company-policy.pdf"
```

With no documents loaded, the bot replies "This information is not available in the company policy."

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/askbot` | ask a question (streamed text response) |
| GET | `/askbot/sessions` | list the caller's chat sessions |
| GET | `/askbot/sessions/:id` | load one session |
| DELETE | `/askbot/sessions/:id` | delete a session |
| GET | `/askbot/most-asked` | topic analytics (admin dashboard) |
| POST | `/policy_upload` | upload policy PDF(s) |

All routes require a valid portal JWT. Sessions are scoped to the logged-in user (`sub`).
