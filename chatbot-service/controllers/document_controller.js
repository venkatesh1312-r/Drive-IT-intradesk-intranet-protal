import fs from 'fs'
import path from 'path'
import {
  list_documents,
  list_recent_documents,
  get_document_by_id,
  delete_document_by_id,
} from '../services/document_services.js'

const UPLOAD_DIR = path.resolve('uploads')

// GET /policy_upload/documents — all uploaded documents, newest first.
export const get_documents = async (req, res) => {
  try {
    const docs = await list_documents()
    res.json({ success: true, documents: docs })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// GET /policy_upload/recent — every document from the most recent upload
// batch (whether that was 1 file or 20), most recent first. `limit` acts
// only as a safety ceiling, not a target count.
export const get_recent_documents = async (req, res) => {
  try {
    const hardCap = Math.min(Number(req.query.limit) || 50, 100)
    const docs = await list_recent_documents(hardCap)
    res.json({ success: true, documents: docs })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// GET /policy_upload/:id/view — stream the original PDF back for viewing/downloading.
export const view_document = async (req, res) => {
  try {
    const pd_id = Number(req.params.id)
    if (!Number.isInteger(pd_id)) {
      return res.status(400).json({ success: false, error: 'Invalid document id' })
    }

    const doc = await get_document_by_id(pd_id)
    if (!doc || !doc.file_name) {
      return res.status(404).json({ success: false, error: 'Document not found' })
    }

    // Guard against the stored file_name ever containing a path segment.
    const safe_name = path.basename(doc.file_name)
    const file_path = path.join(UPLOAD_DIR, safe_name)

    if (!fs.existsSync(file_path)) {
      return res.status(404).json({ success: false, error: 'File is no longer available on disk' })
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${safe_name}"`)
    fs.createReadStream(file_path).pipe(res)
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// DELETE /policy_upload/:id — remove the DB row (cascades embeddings) and the file on disk.
export const delete_document = async (req, res) => {
  try {
    const pd_id = Number(req.params.id)
    if (!Number.isInteger(pd_id)) {
      return res.status(400).json({ success: false, error: 'Invalid document id' })
    }

    const doc = await get_document_by_id(pd_id)
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' })
    }

    await delete_document_by_id(pd_id)

    if (doc.file_name) {
      const safe_name = path.basename(doc.file_name)
      const file_path = path.join(UPLOAD_DIR, safe_name)
      fs.unlink(file_path, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.warn(`[delete_document] Could not remove file ${file_path}:`, err.message)
        }
      })
    }

    res.json({ success: true, message: 'Document deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: error.message })
  }
}
