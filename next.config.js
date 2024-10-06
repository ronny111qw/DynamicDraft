/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: ['kcnbqgaflkiylzrqpuuh.supabase.co'],
  },
  env: {
    NEXT_PUBLIC_LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
    NEXT_PUBLIC_LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI,
  },
};

module.exports = {
  ...nextConfig,
  async rewrites() {
    return [
      {
        source: '/api/linkedin-callback',
        destination: '/api/linkedin-callback',
      },
    ];
  },
};