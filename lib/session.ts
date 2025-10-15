import { getIronSession } from 'iron-session/edge'
import type { NextRequest } from 'next/server'

export type WeamSession = {
  user?: { id: string; email: string }
  companyId?: string
}

export async function getSession(req: NextRequest): Promise<WeamSession & any> {
  if (process.env.WEAM_AUTH_BYPASS === 'true') {
    return { user: { id: 'dev-user', email: 'dev@local' }, companyId: 'dev-company' } as any
  }
  const cookieName = process.env.WEAM_COOKIE_NAME as string
  const password = process.env.WEAM_COOKIE_PASSWORD as string
  if (!cookieName || !password) {
    // Fallback to empty session if env not set
    return { user: undefined, companyId: undefined } as any
  }

  return await getIronSession<WeamSession>(req, { cookieName, password })
}
