const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    let backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    if (process.env.RENDER) {
      backendUrl = 'http://localhost:5000';
    }
    if (backendUrl.endsWith('/')) {
      backendUrl = backendUrl.slice(0, -1);
    }
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
