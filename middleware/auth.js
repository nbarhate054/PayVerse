import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.header
      ? (req.header('Authorization') || req.headers?.authorization || req.headers?.Authorization)
      : (req.headers?.authorization || req.headers?.Authorization);

    if (!authHeader) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.toString().replace(/^Bearer\s+/i, '').trim();
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ success: false, message: "Invalid session token" });
    }

    const secret = process.env.JWT_SECRET || 'payverse_secret_key_123';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Session expired or invalid" });
  }
};

export default authMiddleware;
