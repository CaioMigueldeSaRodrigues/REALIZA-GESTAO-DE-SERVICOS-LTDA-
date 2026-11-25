import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
 output: 'standalone', poweredByHeader: false,
 serverExternalPackages:['pdf-parse','mammoth']
};
export default nextConfig;
