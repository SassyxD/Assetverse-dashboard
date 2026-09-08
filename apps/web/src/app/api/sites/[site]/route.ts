import { NextResponse } from 'next/server';
import { snapshots } from '@assetverse/fixtures';

export const GET = async (_req: Request, ctx: { params: Promise<{ site: string }> }) => {
  const { site } = await ctx.params;
  const snap = snapshots().find((s) => s.site === site);
  if (!snap) {
    return NextResponse.json({ error: { message: `ไม่รู้จักเว็บ ${site}` } }, { status: 404 });
  }
  return NextResponse.json(snap);
};
