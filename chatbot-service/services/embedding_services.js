import ollama from 'ollama'

const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

// Small in-memory cache so repeated identical queries skip Ollama.
const cache = new Map()

const generate_embedding = async (data) => {
  const key = data.trim().toLowerCase()
  if (cache.has(key)) {
    console.log('cache hit ✅')
    return cache.get(key)
  }
  console.log('cache miss ❌')

  const response = await ollama.embeddings({
    model: EMBED_MODEL,
    prompt: data,
    keep_alive: '60m',
  })

  cache.set(key, response.embedding)
  return response.embedding
}

export default generate_embedding
