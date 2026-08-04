/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/': ['./index.html'],
  },
};

module.exports = nextConfig;
