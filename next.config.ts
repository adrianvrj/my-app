const nextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ['assumption-dirt-facts-rica.trycloudflare.com'],
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
