import { connectToDatabase } from '../../../../lib/db'
import Chat from '../../../../models/Chat'
import { getSession } from '../../../../lib/session'

export async function GET(request: Request, { params }: { params: { threadId: string } }) {
  const session = await getSession(request as any)
  if (!session?.user) return new Response('Not found', { status: 404 })
  await connectToDatabase()
  const chat = await Chat.findOne({ threadId: params.threadId, 'user.id': session.user.id, companyId: session.companyId })
  if (!chat) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  return new Response(JSON.stringify(chat), { status: 200 })
}

export async function POST(request: Request, { params }: { params: { threadId: string } }) {
  const session = await getSession(request as any)
  if (!session?.user) return new Response('Not found', { status: 404 })
  await connectToDatabase()
  const body = await request.json()
  const { role, content } = body || {}
  if (!role || !content) return new Response(JSON.stringify({ error: 'role and content required' }), { status: 400 })
  const chat = await Chat.findOne({ threadId: params.threadId, 'user.id': session.user.id, companyId: session.companyId })
  if (!chat) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  const message = { id: crypto.randomUUID(), role, content, createdAt: new Date() }
  chat.messages.push(message as any)
  chat.title = chat.title || String(content).slice(0, 80)
  chat.updatedAt = new Date()
  await chat.save()
  return new Response(JSON.stringify({ ok: true, message }), { status: 201 })
}


