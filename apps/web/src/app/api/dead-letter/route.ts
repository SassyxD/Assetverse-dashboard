import { NextResponse } from 'next/server';
import { snapshots } from '@assetverse/fixtures';

export const GET = () =>
  NextResponse.json(
    snapshots()
      .filter((s) => (s.queue.deadLetterDepth.value ?? 0) > 0)
      .map((s) => ({
        site: s.site,
        depth: s.queue.deadLetterDepth.value ?? 0,
        reasons: s.queue.deadLetterReasons,
      })),
  );
