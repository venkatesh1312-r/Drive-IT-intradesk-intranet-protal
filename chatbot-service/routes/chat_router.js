import express from 'express'
import askQuestion, { getSessions, getSession, deleteSession, getMostAsked } from '../controllers/chat_controller.js'
import isAuthenticated from '../middleware/auth_middleware.js'

const router = express.Router()

router.use(isAuthenticated) // protects ALL chat routes

router.post('/', askQuestion)
router.get('/most-asked', getMostAsked)
router.get('/sessions', getSessions)
router.get('/sessions/:id', getSession)
router.delete('/sessions/:id', deleteSession)

export default router
