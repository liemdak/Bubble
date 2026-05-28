/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/circle-proxy/:path*',
        destination: 'https://api.circle.com/:path*',
      },
    ]
  },
}

export default nextConfig;
