import jwt from 'jsonwebtoken'

// Verifies the DriveIT login JWT from the httpOnly `token` cookie (set by
// the NestJS backend on login). The frontend never reads or stores this
// token itself — the browser attaches the cookie automatically on
// credentialed requests. Uses the SAME JWT_SECRET as the NestJS backend.
//
// The NestJS payload is { sub, email, role, sid } — we expose `sub` as
// req.user.id so the existing chat controller (which scopes sessions by
// emp_id) works unchanged. `sid` isn't re-checked against the DB here
// (that single-active-session enforcement lives in the NestJS backend);
// worst case a just-logged-out-elsewhere token stays valid for the chat
// widget until its 24h expiry, which is an acceptable tradeoff for this
// sidecar service.
const isAuthenticated = (req, res, next) => {
  const token = req.cookies?.token

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
