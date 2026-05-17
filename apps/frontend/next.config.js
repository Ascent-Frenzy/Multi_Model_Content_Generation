/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@app/types', '@app/constants'],
};
module.exports = nextConfig;
