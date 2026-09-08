import { NextResponse } from 'next/server';
import { dashboard } from '@assetverse/fixtures';

/**
 * ทางสำรองตอนไม่มี gateway (เช่นบน Vercel) โครง response ต้องเท่ากับ
 * services/gateway ทุกประการ ไม่งั้นสลับโหมดแล้ว frontend พัง
 */
export const dynamic = 'force-dynamic';

export const GET = () => NextResponse.json(dashboard());
