const { getIronSession } = require('iron-session');
const ironOption = require('../config/ironOption');
const { getHostnameFromRequest } = require('../lib/utils');

// Configure iron-session to read the existing Weam cookie
function weamSessionMiddleware() {
  // Express-compatible middleware that loads iron-session
  return function loadWeamSession(req, res, next) {
    getIronSession(req, res, ironOption)
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

// Helper function to call check-access API
async function callCheckAccessAPI(userId, urlPath, baseUrl) {
  try {
    const basePath = process.env.NEXT_PUBLIC_API_BASE_PATH || '/ai-video';
    const fullUrl = `${baseUrl}${basePath}/api/auth/check-access`;
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        urlPath
      }),
    });

    if (!response.ok) {
      return false;
    }

    const jsonData = await response.json();
    return jsonData.data?.hasAccess;
  } catch (error) {
    console.error('Error calling check-access API:', error);
    return false;
  }
}

// Guard middleware for routes that require authentication with access control
async function requireWeamAuth(req, res, next) {
  // Allow bypass ONLY when explicitly enabled
  const bypassAuth = process.env.WEAM_AUTH_BYPASS === 'true';
  if (bypassAuth) {
    // Synthesize a minimal dev user so downstream code works
    req.user = req.user || { _id: 'dev-user', email: 'dev@local', companyId: 'dev-company' };
    return next();
  }

  if (!req.session || !req.session.user) {
    // Per Weam standards, hide auth status behind 404
    return res.status(404).json({ error: 'Not found' });
  }

  // Call check-access API for every protected route access
  if (req.session.user.roleCode === 'USER') {
    try {
      const baseUrl = getHostnameFromRequest(req);
      const urlPath = req.originalUrl || req.url;
      
      const hasAccess = await callCheckAccessAPI(
        req.session.user._id, 
        urlPath, 
        baseUrl
      );
      
      if (!hasAccess) {
        console.log('Access denied, returning 404');
        return res.status(404).json({ error: 'Not found' });
      }
    } catch (error) {
      console.error('Error in middleware check-access call:', error);
      return res.status(404).json({ error: 'Not found' });
    }
  }

  return next();
}

module.exports = { weamSessionMiddleware, requireWeamAuth };


