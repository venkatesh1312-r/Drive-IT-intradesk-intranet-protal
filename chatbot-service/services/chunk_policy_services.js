// import pool from '../config/db.js'

// const chunk_policy_insertion=async(pd_id,chunk_index,chunk_text,embedding)=>{

//     const embedding_str = `[${embedding.join(',')}]`;

//     const result= await pool.query(
//         'INSERT INTO "CHUNKED_POLICY_DOC"(pd_id,chunk_index,chunk_text,embedding) VALUES($1,$2,$3,$4) RETURNING*',
//         [pd_id,chunk_index,chunk_text,embedding_str]
//     );

//     return result
// }

// export default chunk_policy_insertion

import prisma from '../config/prisma.js'

const chunk_policy_insertion = async (pd_id, chunk_index, chunk_text, embedding) => {
  const embedding_str = `[${embedding.join(',')}]`

  await prisma.$executeRaw`
    INSERT INTO "CHUNKED_POLICY_DOC" (pd_id, chunk_index, chunk_text, embedding)
    VALUES (${pd_id}, ${chunk_index}, ${chunk_text}, ${embedding_str}::vector)
  `

  return { success: true }
}

export default chunk_policy_insertion