/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Room for a logo upload from the admin settings (the file itself is capped at 1 MB).
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};
export default nextConfig;
