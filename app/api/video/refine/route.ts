import axios from 'axios'
import { connectToDatabase } from '../../../../lib/db'
import Chat from '../../../../models/Chat'

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const body = await request.json()
    const threadId: string = body?.threadId || ''
    const refinement: string = body?.refinement || ''
    const duration: number = parseInt(body?.duration) || 5
    const aspectRatio: string = typeof body?.aspectRatio === 'string' ? body.aspectRatio : '16:9'
    const model: string = typeof body?.model === 'string' ? body.model : 'gen4_turbo'

    if (!threadId) {
      return new Response(JSON.stringify({ error: 'threadId is required' }), { status: 400 })
    }
    if (!refinement || !refinement.trim()) {
      return new Response(JSON.stringify({ error: 'refinement text is required' }), { status: 400 })
    }

    const chat = await Chat.findOne({ threadId })
    if (!chat) {
      return new Response(JSON.stringify({ error: 'Thread not found' }), { status: 404 })
    }

    // Find the latest user prompt to refine
    const lastUserMsg = [...chat.messages].reverse().find((m: any) => m.role === 'user')
    const basePrompt: string = lastUserMsg?.content || ''
    const refinedPrompt: string = basePrompt
      ? `${basePrompt}\n\nRefine with: ${refinement}`
      : refinement

    const apiKey = process.env.RUNWAY_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server missing RUNWAY_API_KEY' }), { status: 500 })
    }

    const ratioMap: Record<string, string> = {
      '16:9': '1280:720',
      '9:16': '720:1280',
      '1:1': '960:960',
      '4:3': '1280:960',
      '3:4': '960:1280',
    }
    const ratio = ratioMap[aspectRatio] || '1280:720'

    const client = axios.create({
      baseURL: 'https://api.dev.runwayml.com',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      timeout: 30000,
    })

    const response = await client.post('/v1/image_to_video', {
      promptImage: 'https://picsum.photos/512/512',
      promptText: refinedPrompt.trim(),
      duration,
      ratio,
      model,
    })

    return new Response(JSON.stringify({ success: true, data: response.data, refinedPrompt }), { status: 200 })
  } catch (err: any) {
    const status = err?.response?.status || 500
    const message = err?.response?.data?.error || err?.message || 'Unknown error'
    return new Response(JSON.stringify({ error: message }), { status })
  }
}


