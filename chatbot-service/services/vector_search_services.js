// ─────────────────────────────────────────────────────────────
// In-memory cosine similarity search (no pgvector required).
//
// Embeddings are stored as JSON text in ChunkedPolicyDoc.embedding.
// Parsing that JSON for every chunk on every request is the slow part,
// so we parse once and keep the float vectors in memory. The cache is
// invalidated automatically when the number of stored chunks changes
// (e.g. an admin uploads / removes a policy doc), which is a single
// cheap COUNT query instead of re-reading + re-parsing every row.
//
// Retrieval is intentionally a little generous: we return more chunks
// and use a looser relevance cutoff so the LLM has enough related
// material to reason across and link sections together, instead of
// only exact matches.
// ─────────────────────────────────────────────────────────────
import prisma from '../config/prisma.js'
import generate_embedding from './embedding_services.js'

// Looser than the old 0.6 so semantically-related sections are included
// and the model can link them. Overridable via env for tuning.
const DISTANCE_CUTOFF = Number(process.env.RAG_DISTANCE_CUTOFF) || 0.72
const DEFAULT_LIMIT = Number(process.env.RAG_TOP_K) || 6

// Parsed-vector cache (module lifetime).
let vectorCache = null // [{ chunk_text, vec }]
let cachedCount = -1

function cosineSimilarity(a, b) {
  let dot = 0
  let normA = 0
  let normB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function loadVectors() {
  const count = await prisma.chunkedPolicyDoc.count({ where: { embedding: { not: null } } })
  if (vectorCache && count === cachedCount) return vectorCache

  console.time('vector cache rebuild')
  const rows = await prisma.chunkedPolicyDoc.findMany({
    where: { embedding: { not: null } },
    select: { chunk_text: true, embedding: true },
  })

  const parsed = []
  for (const row of rows) {
    try {
      parsed.push({ chunk_text: row.chunk_text, vec: JSON.parse(row.embedding) })
    } catch {
      /* skip malformed embedding */
    }
  }
  vectorCache = parsed
  cachedCount = count
  console.timeEnd('vector cache rebuild')
  return vectorCache
}

const vector_search = async (data, limit = DEFAULT_LIMIT) => {
  console.time('1. embedding')
  const queryEmbedding = await generate_embedding(data)
  console.timeEnd('1. embedding')

  console.time('2. cosine search')
  const vectors = await loadVectors()

  const scored = vectors.map((row) => ({
    chunk_text: row.chunk_text,
    distance: 1 - cosineSimilarity(queryEmbedding, row.vec),
  }))

  scored.sort((a, b) => a.distance - b.distance)
  const relevant = scored.filter((r) => r.distance < DISTANCE_CUTOFF).slice(0, limit)
  console.timeEnd('2. cosine search')
  return relevant
}

export default vector_search
