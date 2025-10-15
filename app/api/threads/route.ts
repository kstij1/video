import { connectToDatabase } from '../../../lib/db'
import Chat from '../../../models/Chat'
import { getSession } from '../../../lib/session'

export async function GET(request: Request) {
  const session = await getSession(request as any)
  if (!session?.user) return new Response('Not found', { status: 404 })
  await connectToDatabase()
  const threads = await Chat.find({ 'user.id': session.user.id, companyId: session.companyId }, { threadId: 1, title: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(50)
  return new Response(JSON.stringify({ threads }), { status: 200 })
}

export async function POST(request: Request) {
  const session = await getSession(request as any)
  if (!session?.user) return new Response('Not found', { status: 404 })
  await connectToDatabase()
  const body = await request.json().catch(() => ({}))
  const title = (body?.title || 'New chat').toString().slice(0, 80)
  const threadId = crypto.randomUUID()
  const chat = await Chat.create({ threadId, title, messages: [], user: session.user, companyId: session.companyId })
  return new Response(JSON.stringify({ threadId, chat: { threadId, title: chat.title, updatedAt: chat.updatedAt } }), { status: 201 })
}


