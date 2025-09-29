// Utility functions
function getHostnameFromRequest(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || req.get('host');
  const protocolHeader = req.headers['x-forwarded-proto'] || req.get('x-forwarded-proto');
  const protocol = protocolHeader || (req.secure ? 'https' : 'http');
  return `${protocol}://${host}`;
}

module.exports = { getHostnameFromRequest };
