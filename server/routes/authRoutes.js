const express = require('express');
const router = express.Router();
const { getHostnameFromRequest } = require('../lib/utils');

// Check-Access API Route
router.post('/check-access', async (req, res) => {
  try {
    const { userId, urlPath } = req.body || {};

    // Validate required fields
    if (!userId || !urlPath) {
      return res.status(400).json({ error: 'Missing required fields: userId and urlPath are required' });
    }

    // Call the external API
    const baseUrl = getHostnameFromRequest(req);
    const externalApiUrl = `${baseUrl}/napi/v1/common/check-access-solution`;
    
    // Create basic auth header
    const username = process.env.API_BASIC_AUTH_USERNAME || '';
    const password = process.env.API_BASIC_AUTH_PASSWORD || '';
    const basicauth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const response = await fetch(externalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicauth}`,
      },
      body: JSON.stringify({ userId, urlPath }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: 'External API error', status: response.status, message: errorText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Error calling check-access-solution API:', error);
    return res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

module.exports = router;
