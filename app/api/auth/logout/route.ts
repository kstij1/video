import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../config/withSession';

export async function POST(request: NextRequest) {
  const session = await getSession();
  await session.destroy();
  return NextResponse.json({ ok: true });
}