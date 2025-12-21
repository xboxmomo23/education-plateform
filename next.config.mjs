/** @type {import('next').NextConfig} */
const rawInternalApiUrl = process.env.API_INTERNAL_URL || 'http://backend:4000'
const INTERNAL_API_ORIGIN = rawInternalApiUrl.replace(/\/+$/, '')
const INTERNAL_API_BASE = INTERNAL_API_ORIGIN.endsWith('/api')
  ? INTERNAL_API_ORIGIN
  : `${INTERNAL_API_ORIGIN}/api`

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${INTERNAL_API_BASE}/:path*`,
      },
    ]
  },
}

export default nextConfig
