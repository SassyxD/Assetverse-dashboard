import { NextResponse } from 'next/server';
import { SITES } from '@assetverse/contracts';

export const GET = () => NextResponse.json(SITES);
