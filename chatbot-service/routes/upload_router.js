import multer from 'multer'
import express from 'express'
import fs from 'fs'
import { upload_pdf } from '../controllers/upload_controller.js'
import {
  get_documents,
  get_recent_documents,
  view_document,
  delete_document,
} from '../controllers/document_controller.js'
import isAuthenticated from '../middleware/auth_middleware.js'

const router = express.Router()

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads')

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('only PDF files are allowed'))
  },
})

router.use(isAuthenticated)
router.post('/', upload.array('pdf', 10), upload_pdf)

// Documents admin list ("Documents Available" + "Recent Uploads" cards)
router.get('/documents', get_documents)
router.get('/recent', get_recent_documents)
router.get('/:id/view', view_document)
router.delete('/:id', delete_document)

export default router
