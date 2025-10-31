import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../config/withSession';

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Replace below with your credential validation logic
  // Example: After validating user - set session:
  const session = await getSession();
  session.user = {
    _id: body.userId,
    email: body.email,
    companyId: body.companyId,
    roleCode: 'USER', // or 'ADMIN'
  };
  await session.save();
  return NextResponse.json({ ok: true });
}