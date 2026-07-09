import prisma from '../config/prisma.js'

const policy_insertion = async (file_name, full_text) => {
  const policy = await prisma.policyDoc.create({
    data: { file_name, full_text },
    select: { pd_id: true },
  })
  return policy.pd_id
}

export default policy_insertion
