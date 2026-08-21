// Simple in-memory rate limiter to prevent brute-force attacks and spam
const rateLimit = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options.max || 10; // 10 attempts default
  const message = options.message || { error: 'Too many requests, please try again later.' };
  
  const hits = new Map();
  
  // Clean up expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of hits.entries()) {
      if (now - data.startTime > windowMs) {
        hits.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
  
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    let record = hits.get(ip);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      hits.set(ip, record);
      return next();
    }
    
    record.count++;
    if (record.count > max) {
      return res.status(429).json(message);
    }
    
    next();
  };
};

module.exports = { rateLimit };
