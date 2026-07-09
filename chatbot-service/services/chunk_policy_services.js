import prisma from '../config/prisma.js'

// Embedding is stored as JSON text (SQLite has no vector type). The JS cosine
// search in vector_search_services.js parses it back into a number[].
const chunk_policy_insertion = async (pd_id, chunk_index, chunk_text, embedding) => {
  await prisma.chunkedPolicyDoc.create({
    data: {
      pd_id,
      chunk_index,
      chunk_text,
      embedding: JSON.stringify(embedding),
    },
  })
  return { success: true }
}

export default chunk_policy_insertion
