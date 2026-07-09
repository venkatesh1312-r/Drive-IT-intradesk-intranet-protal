// One-off: seed a sample policy doc so RAG has content to retrieve.
import text_to_chunks from './services/chunk_services.js'
import generate_embedding from './services/embedding_services.js'
import policy_insertion from './services/policy_services.js'
import chunk_policy_insertion from './services/chunk_policy_services.js'

const POLICY = `
Section 1. Attendance
Employees must be at the office by 9:30 AM. Core working hours are 9:30 AM to 6:30 PM,
Monday to Friday. Three late arrivals in a month are treated as one day of absence.

Section 2. Leave Policy
Every employee is entitled to 24 paid leaves per calendar year: 12 casual leaves and 12 sick
leaves. Leaves must be applied at least 3 days in advance except for sick leave. Unused casual
leaves lapse at year end; up to 6 sick leaves may be carried forward.

Section 3. Dress Code
Employees must maintain formal or smart-casual attire on client-facing days. Jeans are permitted
on Fridays only. Footwear must be closed-toe in the lab areas.

Section 4. Work From Home
Employees may work from home up to 2 days per week with manager approval. WFH requests must be
raised on the portal by 6 PM the previous day.

Section 5. Conduct and Misconduct
Misconduct includes harassment, theft, and repeated policy violations. A first offence usually
results in a written warning; repeated misconduct can lead to termination after due process.
`

const run = async () => {
  const pd_id = await policy_insertion('sample-company-policy.txt', POLICY)
  const chunks = await text_to_chunks(POLICY)
  console.log(`Chunking into ${chunks.length} chunks, embedding...`)
  let i = 0
  for (const c of chunks) {
    const emb = await generate_embedding(c.pageContent)
    await chunk_policy_insertion(pd_id, ++i, c.pageContent, emb)
  }
  console.log(`Seeded policy pd_id=${pd_id} with ${chunks.length} embedded chunks.`)
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
