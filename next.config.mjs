/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly set the workspace root for Turbopack so it
  // does not try to infer it from other lockfiles on disk.
  // In ESM configs we use process.cwd() instead of __dirname.
  turbopack: {
    root: process.cwd(),
  },
  reactCompiler: true,
};

export default nextConfig;
