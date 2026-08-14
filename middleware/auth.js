const requireAdmin = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized. Admin login required.' });
};

module.exports = { requireAdmin };
