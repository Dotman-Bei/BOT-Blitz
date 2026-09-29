/** @type {import('next').NextConfig} */
const nextConfig = {
  // Every route reads the chain from the browser, so the app ships as static files:
  // no server, no backend deciding scores.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  webpack: (config) => {
    // wagmi's optional connectors reference packages we don't ship.
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    config.resolve.fallback = { ...config.resolve.fallback, '@react-native-async-storage/async-storage': false }
    return config
  },
}

export default nextConfig
