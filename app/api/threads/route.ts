import { connectToDatabase } from '../../../lib/db'
import Chat from '../../../models/Chat'
import { getSession } from '../../../config/withSession';

export async function GET() {
  await connectToDatabase()
  const session = await getSession();
  const companyId = session?.user?.companyId;
  // Only return threads for this company
  if (!companyId) return new Response(JSON.stringify({ threads: [] }), { status: 200 });
  const threads = await Chat.find({ companyId }, { threadId: 1, title: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(50)
  return new Response(JSON.stringify({ threads }), { status: 200 })
}

export async function POST(request: Request) {
  await connectToDatabase()
  const session = await getSession();
  const userId = session?.user?._id;
  const companyId = session?.user?.companyId;
  const body = await request.json().catch(() => ({}))
  const title = (body?.title || 'New chat').toString().slice(0, 80)
  const threadId = crypto.randomUUID()
  // Save companyId on chat for company-level isolation
  const chat = await Chat.create({ threadId, title, messages: [], userId, companyId })
  return new Response(JSON.stringify({ threadId, chat: { threadId, title: chat.title, updatedAt: chat.updatedAt } }), { status: 201 })
}

export async function DELETE() {
  await connectToDatabase()
  const session = await getSession();
  const companyId = session?.user?.companyId;
  if (!companyId) return new Response(JSON.stringify({ ok: true, deletedAll: true }), { status: 200 });
  // Only delete this company's threads
  await Chat.deleteMany({ companyId })
  return new Response(JSON.stringify({ ok: true, deletedAll: true }), { status: 200 })
}


