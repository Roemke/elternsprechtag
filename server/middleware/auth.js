const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Nicht autorisiert' })
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded // Benutzerinfo im Request speichern / hinzufügen
    next() //nächster handler
  } catch (_err) {
    return res.status(401).json({ error: 'Token ungültig' })
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'global_admin' && req.user.role !== 'school_admin') {
      return res.status(403).json({ error: 'Keine Berechtigung' })
    } //school_admin oder global_admin => hier keine Unterscheidung, 
    // ein school_admin könnte theoretisch auch auf andere Schulen zugreifen, 
    // aber das wird in den Routen dann nochmal geprüft, die richtige middleware wird gerufen
    next()
  })
}

function globalAdminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'global_admin') {
      return res.status(403).json({ error: 'Keine Berechtigung' })
    }
    next()
  })
}

module.exports = { authMiddleware, adminMiddleware, globalAdminMiddleware }