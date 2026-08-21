const crypto = require('crypto');
const SESSION_SECRET = process.env.SESSION_SECRET || 'kalavedika_secret_2026_CHANGE_ME';

function generateAdminToken(adminId, email) {
  const payload = JSON.stringify({ adminId: String(adminId), email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const b64Payload = Buffer.from(payload).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('base64url');
  return `${b64Payload}.${signature}`;
}

function verifyAdminToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [b64Payload, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

const requireAdmin = (req, res, next) => {
  // 1. Check session cookie
  if (req.session && req.session.adminId) {
    return next();
  }
  
  // 2. Check Authorization header or x-admin-token header
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
  const token = authHeader ? (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader) : null;
  const payload = verifyAdminToken(token);
  if (payload) {
    req.admin = payload;
    return next();
  }
  
  res.status(401).json({ error: 'Unauthorized. Admin login required.' });
};

module.exports = { requireAdmin, generateAdminToken, verifyAdminToken };

