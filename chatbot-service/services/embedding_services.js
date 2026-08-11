import ollama from 'ollama'

const cache = new Map()

const generate_embedding = async (data) => {
  const key = data.trim().toLowerCase()
  if (cache.has(key)){ 
    console.log('cache hit ✅')
    return cache.get(key)}

    console.log('cache miss ❌')    // ← add this
  const response = await ollama.embeddings({
    model: 'nomic-embed-text',
    prompt: data,
    keep_alive: "60m"
  })

  cache.set(key, response.embedding)
  return response.embedding
}

export default generate_embedding