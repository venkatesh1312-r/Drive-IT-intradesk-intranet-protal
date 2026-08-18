// import pool from '../config/db.js'


// const policy_insertion=async(file_name,full_text)=>{

//     const result= await pool.query(
//         'INSERT INTO "POLICY_DOC"(file_name,full_text) VALUES($1,$2) RETURNING pd_id',
//         [file_name,full_text]
//     );

//     return result.rows[0].pd_id
// }

// export default policy_insertion


// server/services/policy_services.js
import prisma from '../config/prisma.js'

const policy_insertion = async (file_name, full_text, upload_batch = null) => {
  const policy = await prisma.policyDoc.create({
    data: { file_name, full_text, upload_batch },
    select: { pd_id: true },
  })
  return policy.pd_id
}

export default policy_insertion
