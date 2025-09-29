const { getIronSession } = require('iron-session');
const ironOption = require('./ironOption');

// Express-compatible session helper
async function getSession(req, res) {
    const session = await getIronSession(req, res, ironOption);
    return session;
}

module.exports = { getSession };
