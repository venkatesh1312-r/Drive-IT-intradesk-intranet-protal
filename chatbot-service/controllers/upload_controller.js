import policy_insertion from '../services/policy_services.js'
import chunk_policy_insertion from '../services/chunk_policy_services.js'
import generate_embedding from '../services/embedding_services.js'
import text_to_chunks from '../services/chunk_services.js'
import extract_pdf_text from '../services/pdf_services.js'

export const upload_pdf = async (req, res) => {
  try {
    const files = req.files
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No PDF files uploaded' })
    }

    for (const file of files) {
      const file_path = file.path
      const file_name = file.filename

      const full_text = await extract_pdf_text(file_path)
      const pd_id = await policy_insertion(file_name, full_text)
      const chunks = await text_to_chunks(full_text)

      const embeddingPromises = chunks.map((chunk, i) =>
        generate_embedding(chunk.pageContent).then((embedding) =>
          chunk_policy_insertion(pd_id, i + 1, chunk.pageContent, embedding),
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
