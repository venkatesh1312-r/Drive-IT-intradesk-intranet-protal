// import pool from '../config/db.js'
// import generate_embedding from './embedding_services.js'

// // ✅ Reusing the existing pool from db.js — no need to create a new one

// const vector_search = async (data) => {

//   console.time('1. embedding')
//   const embedding = await generate_embedding(data)
//   console.timeEnd('1. embedding')

//   const embedding_str = `[${embedding.join(',')}]`

//   console.time('2. pgvector search')
//   const client = await pool.connect()

//   try {
//     await client.query('SET hnsw.ef_search = 20')

//     const result = await client.query(
//       `SELECT chunk_text, embedding <=> $1 AS distance
//        FROM "CHUNKED_POLICY_DOC"
//        ORDER BY distance
//        LIMIT 5`,
//       [embedding_str]
//     )

//     // ✅ Only return chunks that are actually relevant
//     const relevant = result.rows.filter(row => row.distance < 0.6)

//     console.timeEnd('2. pgvector search')
//     return relevant

//   } finally {
//     client.release()
//   }
// }

// export default vector_search


// server/services/vector_search_services.js
// ─────────────────────────────────────────────────────────────
// Uses prisma.$queryRaw — embedding column is Unsupported("vector")
// in schema.prisma (confirmed via prisma db pull). Same SQL logic
// as your original pool-based version. Zero impact on bot speed/quality.
// ─────────────────────────────────────────────────────────────
import prisma from '../config/prisma.js'
import generate_embedding from './embedding_services.js'

const vector_search = async (data) => {
  console.time('1. embedding')
  const embedding = await generate_embedding(data)
  console.timeEnd('1. embedding')

  const embedding_str = `[${embedding.join(',')}]`

  console.time('2. pgvector search')

  try {
    await prisma.$executeRaw`SET hnsw.ef_search = 20`

    const rows = await prisma.$queryRaw`
      SELECT chunk_text, embedding <=> ${embedding_str}::vector AS distance
      FROM "CHUNKED_POLICY_DOC"
      ORDER BY distance
      LIMIT 5
    `

    const relevant = rows.filter(row => row.distance < 0.6)
    console.timeEnd('2. pgvector search')
    return relevant

  } catch (err) {
    console.timeEnd('2. pgvector search')
    throw err
  }
}

export default vector_search
