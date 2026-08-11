// import pool from '../config/db.js'

// function deriveTitle(messages) {
//   const first = messages.find(m => m.role === 'user')
//   if (!first) return 'New conversation'
//   return first.text.length > 50 ? first.text.slice(0, 50) + '…' : first.text
// }

// export async function getAllSessions() {
//   const result = await pool.query(
//     `SELECT id, title, updated_at FROM chat_sessions ORDER BY updated_at DESC`
//   )
//   return result.rows
// }

// export async function getSessionById(id) {
//   const result = await pool.query(
//     `SELECT id, title, messages, updated_at FROM chat_sessions WHERE id = $1`,
//     [id]
//   )
//   return result.rows[0] || null
// }

// export async function upsertSession(id, messages) {
//   const title = deriveTitle(messages)
//   await pool.query(
//     `INSERT INTO chat_sessions (id, title, messages, updated_at)
//      VALUES ($1, $2, $3, NOW())
//      ON CONFLICT (id) DO UPDATE
//        SET title      = EXCLUDED.title,
//            messages   = EXCLUDED.messages,
//            updated_at = NOW()`,
//     [id, title, JSON.stringify(messages)]
//   )
// }

// export async function deleteSessionById(id) {
//   await pool.query(`DELETE FROM chat_sessions WHERE id = $1`, [id])
// }

// import pool from '../config/db.js'

// function deriveTitle(messages) {
//   const first = messages.find(m => m.role === 'user')
//   if (!first) return 'New conversation'
//   return first.text.length > 50 ? first.text.slice(0, 50) + '…' : first.text
// }

// export async function getAllSessions(emp_id) {
//   const result = await pool.query(
//     `SELECT id, title, updated_at FROM chat_sessions
//      WHERE emp_id = $1
//      ORDER BY updated_at DESC`,
//     [emp_id]
//   )
//   return result.rows
// }

// export async function getSessionById(id, emp_id) {
//   const result = await pool.query(
//     `SELECT id, title, messages, updated_at FROM chat_sessions
//      WHERE id = $1 AND emp_id = $2`,
//     [id, emp_id]
//   )
//   return result.rows[0] || null
// }

// export async function upsertSession(id, messages, emp_id) {
//   const title = deriveTitle(messages)
//   await pool.query(
//     `INSERT INTO chat_sessions (id, title, messages, emp_id, updated_at)
//      VALUES ($1, $2, $3, $4, NOW())
//      ON CONFLICT (id) DO UPDATE
//        SET title      = EXCLUDED.title,
//            messages   = EXCLUDED.messages,
//            updated_at = NOW()`,
//     [id, title, JSON.stringify(messages), emp_id]
//   )
// }

// export async function deleteSessionById(id, emp_id) {
//   await pool.query(
//     `DELETE FROM chat_sessions WHERE id = $1 AND emp_id = $2`,
//     [id, emp_id]
//   )
// }


// server/services/session_services.js
import prisma from '../config/prisma.js'

function deriveTitle(messages) {
  const first = messages.find(m => m.role === 'user')
  if (!first) return 'New conversation'
  return first.text.length > 50 ? first.text.slice(0, 50) + '…' : first.text
}

export async function getAllSessions(emp_id) {
  return await prisma.chatSession.findMany({
    where: { emp_id: Number(emp_id) },
    select: { id: true, title: true, updated_at: true },
    orderBy: { updated_at: 'desc' },
  })
}

export async function getSessionById(id, emp_id) {
  const session = await prisma.chatSession.findFirst({
    where: { id, emp_id: Number(emp_id) },
    select: { id: true, title: true, messages: true, updated_at: true },
  })
  return session || null
}

export async function upsertSession(id, messages, emp_id) {
  const title = deriveTitle(messages)

  await prisma.chatSession.upsert({
    where: { id },
    update: {
      title,
      messages,
      updated_at: new Date(),
    },
    create: {
      id,
      title,
      messages,
      emp_id: Number(emp_id),
    },
  })
}

export async function deleteSessionById(id, emp_id) {
  await prisma.chatSession.deleteMany({
    where: { id, emp_id: Number(emp_id) },
  })
}
