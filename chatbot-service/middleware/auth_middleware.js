import jwt from 'jsonwebtoken'

// Verifies the DriveIT login JWT. Accepts the token either as a
// `Authorization: Bearer <token>` header (what the Next.js frontend sends)
// or as a `token` cookie. Uses the SAME JWT_SECRET as the NestJS backend.
//
// The NestJS payload is { sub, email, role } — we expose `sub` as req.user.id
// so the existing chat controller (which scopes sessions by emp_id) works
// unchanged.
const isAuthenticated = (req, res, next) => {
  const header = req.headers.authorization || ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null
  const token = bearer || req.cookies?.token

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: Please log in.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { id: decoded.sub ?? decoded.id, role: decoded.role, email: decoded.email }
    next()
  } catch (error) {
    console.log('[AUTH ERROR] JWT verification failed:', error.message)
    return res.status(401).json({ success: false, message: 'Session expired or invalid token. Please log in again.' })
  }
}

export default isAuthenticated
