// Load .env FIRST — before any module that reads process.env at import time.
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import {Ollama} from 'ollama'

import chat_router from './routes/chat_router.js'
import policy_upload_router from './routes/upload_router.js'
import { errorHandler } from './middleware/error_middleware.js'

const app = express()
const PORT = process.env.PORT || 4000
const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434' })
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

app.use(cors({ origin: FRONTEND_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.use((req, res, next) => {
  console.log(req.method, req.url)
  next()
})

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/askbot', chat_router)
app.use('/policy_upload', policy_upload_router)

app.use(errorHandler)

// Warm the embedding model so the first real request is fast.
const warmup = async () => {
  try {
    console.log('Warming up Ollama embedding model...')
    await ollama.embeddings({ model: EMBED_MODEL, prompt: 'warmup', keep_alive: '120m' })
    console.log('Embedding model ready.')
  } catch (err) {
    console.warn(`[warmup] Could not reach Ollama (${err.message}). Make sure "ollama serve" is running and "${EMBED_MODEL}" is pulled.`)
  }
}

warmup().finally(() => {
  app.listen(PORT, () => console.log(`Chatbot service running on http://localhost:${PORT}`))
})
