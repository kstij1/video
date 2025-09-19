const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const target = process.env.BACKEND_PORT
    ? `http://localhost:${process.env.BACKEND_PORT}`
    : 'http://localhost:3004';

  app.use(
    // Only proxy API calls under /ai-video
    ['/ai-video/api', '/ai-video/api/**'],
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,
      logLevel: 'silent',
      /**
       * If request path starts with /ai-video/api, strip the /ai-video prefix
       * so backend receives /api/...
       */
      pathRewrite: (path, req) => {
        if (path.startsWith('/ai-video/api')) {
          return path.replace('/ai-video', '');
        }
        return path;
      }
    })
  );
};


