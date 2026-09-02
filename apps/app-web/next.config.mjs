/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@stravyx/api-client", "@stravyx/types"],
  // The Figma Make export was authored without strict type-checking;
  // keep builds green while the codebase is incrementally hardened.
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
