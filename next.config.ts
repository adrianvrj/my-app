const nextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ['192.168.1.22', 'visitors-architect-tuner-brandon.trycloudflare.com'],
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
