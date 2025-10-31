import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './config/withSession';

export async function middleware(request: NextRequest) {
  const session = await getSession();
  console.log('session', session);
  // Rewrite to /404 to show custom Next.js 404 page with button
  if (!session || !session.user || !session.user._id) {
    return NextResponse.rewrite(new URL('/404', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"],
};