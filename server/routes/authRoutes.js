const express = require('express');
const router = express.Router();
const { requireWeamAuth } = require('../middleware/weamSession');
const { getHostnameFromRequest } = require('../lib/utils');

// POST /api/auth/check-access
router.post('/check-access', async (req, res) => {
  try {
    const { userId, urlPath } = req.body || {};
    if (!userId || !urlPath) {
      return res.status(400).json({ error: 'Missing required fields: userId and urlPath are required' });
    }

    const baseUrl = getHostnameFromRequest(req);
    const externalUrl = `${baseUrl}/napi/v1/common/check-access-solution`;

    const username = process.env.API_BASIC_AUTH_USERNAME || '';
    const password = process.env.API_BASIC_AUTH_PASSWORD || '';
    const basic = Buffer.from(`${username}:${password}`).toString('base64');

    const response = await fetch(externalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basic}`
      },
      body: JSON.stringify({ userId, urlPath })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'External API error', status: response.status, message: text });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('check-access error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error?.message || String(error) });
  }
});

module.exports = router;


