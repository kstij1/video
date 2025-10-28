import { connectToDatabase } from '../../../lib/db'
import Chat from '../../../models/Chat'

export async function GET() {
  await connectToDatabase()
  const threads = await Chat.find({}, { threadId: 1, title: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(50)
  return new Response(JSON.stringify({ threads }), { status: 200 })
}

export async function POST(request: Request) {
  await connectToDatabase()
  const body = await request.json().catch(() => ({}))
  const title = (body?.title || 'New chat').toString().slice(0, 80)
  const threadId = crypto.randomUUID()
  const chat = await Chat.create({ threadId, title, messages: [] })
  return new Response(JSON.stringify({ threadId, chat: { threadId, title: chat.title, updatedAt: chat.updatedAt } }), { status: 201 })
}

export async function DELETE() {
  await connectToDatabase()
  await Chat.deleteMany({})
  return new Response(JSON.stringify({ ok: true, deletedAll: true }), { status: 200 })
}


