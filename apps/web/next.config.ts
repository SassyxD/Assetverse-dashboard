import type { NextConfig } from 'next';

/**
 * frontend รู้จัก /api/* ทางเดียว ส่วนของจริงอยู่ที่ไหนเป็นเรื่องของ config
 *   มี gateway (dev บนเครื่อง)  proxy ไปที่ :4100 ตามเดิม
 *   ไม่มี gateway (Vercel)      ตกไปที่ route handler ใน app/api ที่อ่าน fixtures
 * ใช้ beforeFiles เพื่อให้ proxy ชนะ route handler เวลามี gateway จริง
 */
const gateway = process.env['GATEWAY_URL'] ?? (process.env['VERCEL'] ? '' : 'http://localhost:4100');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // ปุ่ม dev อยู่มุมซ้ายล่างทับ footer ของ sidebar
  devIndicators: { position: 'bottom-right' },
  // package ใน workspace เป็น TS/ESM ให้ Next แปลงให้
  transpilePackages: ['@assetverse/contracts', '@assetverse/fixtures'],
  async rewrites() {
    if (!gateway) return { beforeFiles: [], afterFiles: [], fallback: [] };
    return {
      beforeFiles: [{ source: '/api/:path*', destination: `${gateway}/api/:path*` }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
