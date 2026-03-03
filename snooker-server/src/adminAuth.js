const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '010203';



function generateAdminToken() {
    return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyAdminToken(req, res, next) {
    const token = req.cookies && req.cookies.admin_token;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role === 'admin') {
            req.user = decoded;
            next();
        } else {
            res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
        }
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
}

module.exports = { generateAdminToken, verifyAdminToken, ADMIN_PASSWORD };
