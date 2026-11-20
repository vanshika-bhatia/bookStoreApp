/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs', 'nodemailer'],
  },
};

module.exports = nextConfig;
