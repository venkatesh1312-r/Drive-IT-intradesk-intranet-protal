import crypto from 'crypto'
import policy_insertion from '../services/policy_services.js'
import chunk_policy_insertion from '../services/chunk_policy_services.js'
import generate_embedding from '../services/embedding_services.js'
import text_to_chunks from '../services/chunk_services.js'
import extract_pdf_text from '../services/pdf_services.js'
import { saveAbbreviations } from '../services/abbreviation_services.js'

export const upload_pdf = async (req, res) => {
  try {
    const files = req.files
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No PDF files uploaded' })
    }

    // One id shared by every file in this request, so "Recent Uploads" can
    // later show the whole batch (5 files, 10 files, however many) instead
    // of a fixed row count.
    const upload_batch = crypto.randomUUID()

    for (const file of files) {
      const file_path = file.path
      const file_name = file.filename

      const { fullText, pages } = await extract_pdf_text(file_path)
      const pd_id = await policy_insertion(file_name, fullText, upload_batch)

      // Auto-detect "Full Term (ABBR)" style shortcuts defined in this PDF
      // (e.g. "Casual Leave (CL)") so the bot understands them later —
      // no hardcoded list, works for whatever a given policy PDF defines.
      await saveAbbreviations(pd_id, fullText)

      const chunks = await text_to_chunks(pages)

      const embeddingPromises = chunks.map((chunk, i) =>
        generate_embedding(chunk.pageContent).then((embedding) =>
          chunk_policy_insertion(pd_id, i + 1, chunk.pageContent, embedding, chunk.page_number),
        ),
      )
      await Promise.all(embeddingPromises)
    }

    res.json({ success: true, message: 'PDF uploaded successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
}
