import prisma from '../config/prisma.js'

const chunk_policy_insertion = async (pd_id, chunk_index, chunk_text, embedding, page_number = null) => {
  const embedding_str = `[${embedding.join(',')}]`

  await prisma.$executeRaw`
    INSERT INTO "CHUNKED_POLICY_DOC" (pd_id, chunk_index, chunk_text, embedding, page_number)
    VALUES (${pd_id}, ${chunk_index}, ${chunk_text}, ${embedding_str}::vector, ${page_number})
  `

  return { success: true }
}

export default chunk_policy_insertion
