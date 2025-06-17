/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for Vercel deployment
  output: 'standalone',
  
  // Reduce build memory usage
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'googleapis', 'openai']
  },
  
  // Optimize images for faster builds
  images: {
    unoptimized: true,
  },
  
  // Webpack optimizations to prevent hanging
  webpack: (config, { isServer }) => {
    // Reduce memory usage
    config.optimization.minimize = true
    
    // Prevent hanging on large builds
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }
    }
    
    return config
  },
  
  // Prevent build timeouts
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  }
}

module.exports = nextConfig