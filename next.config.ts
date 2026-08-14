const nextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: [
    '127.0.0.1',
    '*.trycloudflare.com',
  ],
  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
