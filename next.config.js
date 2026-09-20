/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  images: {
    loader: "akamai",
    path: "",
  },
  env: {
    API_URL: process.env.API_URL,
    APP_VERSION: process.env.npm_package_version,
  },
};

module.exports = nextConfig;
