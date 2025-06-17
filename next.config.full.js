/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for Vercel deployment
  output: 'standalone',
  
  // Reduce build memory usage and prevent hanging
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'googleapis', 'openai'],
    // Disable problematic features that can cause hanging
    webpackBuildWorker: false,
  },
  
  // Optimize images for faster builds
  images: {
    unoptimized: true,
  },
  
  // More aggressive webpack optimizations
  webpack: (config, { isServer, dev }) => {
    // Aggressive memory and performance optimizations
    config.optimization = {
      ...config.optimization,
      minimize: !dev,
      minimizer: dev ? [] : config.optimization.minimizer,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            maxSize: 244000, // 244KB chunks
          },
        },
      },
    }
    
    // Prevent Node.js modules in browser bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        child_process: false,
        stream: false,
        util: false,
        url: false,
        querystring: false,
        path: false,
        os: false,
      }
    }
    
    // Exclude problematic packages from bundling
    config.externals = config.externals || []
    if (isServer) {
      config.externals.push(
        '@google-cloud/local-auth',
        'googleapis'
      )
    }
    
    // Memory management
    config.performance = {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    }
    
    return config
  },
  
  // Build settings
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Power user settings for Vercel
  poweredByHeader: false,
  generateEtags: false,
}

module.exports = nextConfig