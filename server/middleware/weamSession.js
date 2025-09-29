const { getIronSession } = require('iron-session');

// Configure iron-session to read the existing Weam cookie
function weamSessionMiddleware() {
  const cookieName = process.env.WEAM_COOKIE_NAME || process.env.NEXT_PUBLIC_COOKIE_NAME || 'weam';
  const password = process.env.WEAM_COOKIE_PASSWORD || process.env.NEXT_PUBLIC_COOKIE_PASSWORD;

  if (!password) {
    // Fail fast in development to avoid silent auth issues
    console.warn('[WeamSession] Missing WEAM_COOKIE_PASSWORD. Set it to match the AI Doc Editor.');
  }

  const sessionOptions = {
    cookieName,
    password: password || 'change-me-in-env',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  };

  // Express-compatible middleware that loads iron-session
  return function loadWeamSession(req, res, next) {
    getIronSession(req, res, sessionOptions)
      .then((session) => {
        req.session = session;
        if (session && session.user) {
          req.user = session.user;
        }
        next();
      })
      .catch(next);
  };
}

// Guard middleware for routes that require authentication
function requireWeamAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Weam session not found' });
}

module.exports = { weamSessionMiddleware, requireWeamAuth };


