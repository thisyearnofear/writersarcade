/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  experimental: {
    optimizeCss: false, // Disable CSS optimization that may cause issues
  },
  webpack: (config, { isServer, webpack }) => {
    // Ignore test files from problematic dependencies
    config.module.rules.push({
      test: /\.(test|spec)\.(js|ts|mjs)$/,
      loader: 'ignore-loader',
    });
    
    config.module.rules.push({
      test: /node_modules\/(thread-stream|pino)\/.*\.(test|spec|indexes)/,
      loader: 'ignore-loader',
    });

    // Ignore ox files with TypeScript type exports that webpack can't parse
    config.module.rules.push({
      test: /node_modules\/ox\/_esm\/.*\.js$/,
      loader: 'ignore-loader',
    });

    // Ignore RainbowKit CSS to avoid vanilla-extract parsing
    config.module.rules.unshift({
      test: /rainbowkit.*\.css$/,
      loader: 'ignore-loader',
    });

    // Stub out the problematic baseAccount connector since we're not using it
    // This avoids the ox import compatibility issue
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@wagmi\/connectors\/dist\/esm\/baseAccount\.js$/,
        require.resolve('./webpack-stubs/baseAccount-stub.js')
      )
    );

    return config;
  },
}

module.exports = nextConfig
