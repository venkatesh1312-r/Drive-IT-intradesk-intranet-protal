// import express from 'express'
// import askQuestion, { getSessions, getSession, deleteSession } from '../controllers/chat_controller.js'

// let router = express.Router()

// router.post('/', askQuestion)                        // existing — no change
// router.get('/sessions', getSessions)                 // all sessions for sidebar
// router.get('/sessions/:id', getSession)              // load one session
// router.delete('/sessions/:id', deleteSession)        // delete a session

// export default router


// import express from 'express'
// import askQuestion, { getSessions, getSession, deleteSession, getMostAsked } from '../controllers/chat_controller.js'

// let router = express.Router()

// router.post('/',              askQuestion)   // ask a question
// router.get('/most-asked',     getMostAsked)  // most asked questions (for admin dashboard)
// router.get('/sessions',       getSessions)  // all sessions for sidebar
// router.get('/sessions/:id',   getSession)   // load one session
// router.delete('/sessions/:id',deleteSession)// delete a session

// export default router

import express from 'express'
import askQuestion, { getSessions, getSession, deleteSession, getMostAsked } from '../controllers/chat_controller.js'
import isAuthenticated from '../middleware/auth_middleware.js'

let router = express.Router()

router.use(isAuthenticated) // protects ALL chat routes

router.post('/',               askQuestion)
router.get('/most-asked',      getMostAsked)
router.get('/sessions',        getSessions)
router.get('/sessions/:id',    getSession)
router.delete('/sessions/:id', deleteSession)

export default router