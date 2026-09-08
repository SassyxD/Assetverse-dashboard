import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // ปุ่ม dev อยู่มุมซ้ายล่างทับ footer ของ sidebar
  devIndicators: { position: 'bottom-right' },
  // package ใน workspace เป็น TS/ESM — ให้ Next แปลงให้
  transpilePackages: ['@assetverse/contracts'],
  async rewrites() {
    // เรียก /api/* จาก frontend แล้ว proxy ไป gateway — ไม่ต้องยุ่งกับ CORS
    const gateway = process.env['GATEWAY_URL'] ?? 'http://localhost:4100';
    return [{ source: '/api/:path*', destination: `${gateway}/api/:path*` }];
  },
};

export default nextConfig;
