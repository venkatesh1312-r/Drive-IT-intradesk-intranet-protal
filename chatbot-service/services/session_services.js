import prisma from '../config/prisma.js'

// SQLite has no JSON scalar, so `messages` is stored as a JSON string.
function deriveTitle(messages) {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'New conversation'
  return first.text.length > 50 ? first.text.slice(0, 50) + '…' : first.text
}

export async function getAllSessions(emp_id) {
  return prisma.chatSession.findMany({
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
  if (!session) return null
  let messages = []
  try {
    messages = JSON.parse(session.messages || '[]')
  } catch {
    messages = []
  }
  return { ...session, messages }
}

export async function upsertSession(id, messages, emp_id) {
  const title = deriveTitle(messages)
  const messagesStr = JSON.stringify(messages)
  await prisma.chatSession.upsert({
    where: { id },
    update: { title, messages: messagesStr, updated_at: new Date() },
    create: { id, title, messages: messagesStr, emp_id: Number(emp_id) },
  })
}

export async function deleteSessionById(id, emp_id) {
  await prisma.chatSession.deleteMany({ where: { id, emp_id: Number(emp_id) } })
}
