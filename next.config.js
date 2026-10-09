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
    API_URL_V2: process.env.API_URL_V2 || '',
    CLIENT_CONFIG_DEFAULT: process.env.CLIENT_CONFIG_DEFAULT || '',
    APP_VERSION: process.env.npm_package_version,
    // Enviada ao /client-config para receber os módulos do target `cms` (specs/016).
    NEXT_PUBLIC_CMS_VERSION: require('./package.json').version,
  },
};

module.exports = nextConfig;
