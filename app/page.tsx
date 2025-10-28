'use client'

import { useMemo, useRef, useState } from 'react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import MessageBubble from '../components/MessageBubble'

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; videoUrl?: string }

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: crypto.randomUUID(), role: 'assistant', content: 'Hi! Describe a video you want to generate.' },
  ])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [duration, setDuration] = useState(5)
  const [aspect, setAspect] = useState('16:9')
  const [model, setModel] = useState('gen4_turbo')
  const scrollerRef = useRef<HTMLDivElement>(null)

  const submit = async (text: string) => {
    if (!text.trim()) return
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      // If no existing thread, create it and start a fresh generation
      if (!threadId) {
        const newThread = await axios.post('/aivideo/api/threads', { title: text.slice(0, 80) })
        const tid = newThread.data.threadId
        setThreadId(tid)
        await axios.post(`/aivideo/api/threads/${tid}`, { role: 'user', content: text })
        const res = await axios.post('/aivideo/api/video/generate', {
          prompt: text,
          duration,
          aspectRatio: aspect,
          model,
        })
        const pretty = 'Job created.\n\n' + JSON.stringify(res.data, null, 2)
        setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', content: pretty }])
        await axios.post(`/aivideo/api/threads/${tid}`, { role: 'assistant', content: pretty })
      } else {
        // Use iterative refinement on existing thread
        const tid = threadId
        await axios.post(`/aivideo/api/threads/${tid}`, { role: 'user', content: text })
        const res = await axios.post('/aivideo/api/video/refine', {
          threadId: tid,
          refinement: text,
          duration,
          aspectRatio: aspect,
          model,
        })
        const pretty = 'Refined job created.\n\n' + JSON.stringify(res.data, null, 2)
        setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', content: pretty }])
        await axios.post(`/aivideo/api/threads/${tid}`, { role: 'assistant', content: pretty })
      }
    } catch (e: any) {
      const errText = e?.response?.data?.error || e.message
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${errText}` }])
    } finally {
      setLoading(false)
      setTimeout(() => scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' }), 0)
    }
  }

  const header = useMemo(() => (
    <header className="h-16 border-b border-violet-200 flex items-center justify-between px-6 bg-white">
      <div className="flex items-center gap-3">
        <button
          className="text-xs px-3 h-8 rounded border border-violet-200 hover:bg-violet-50"
          onClick={() => history.back()}
        >Back</button>
      </div>
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <select className="h-9" value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="gen4_turbo">Runway Gen-4 Turbo</option>
          <option value="gen3">Runway Gen-3</option>
          <option value="veo3">Veo3</option>
        </select>
        <select className="h-9" value={aspect} onChange={(e) => setAspect(e.target.value)}>
          <option>16:9</option>
          <option>9:16</option>
          <option>1:1</option>
          <option>4:3</option>
          <option>3:4</option>
        </select>
        <input className="h-9 w-24" type="number" min={1} max={15} value={duration} onChange={(e) => setDuration(parseInt(e.target.value || '5'))} />
      </div>
    </header>
  ), [model, aspect, duration])

  return (
    <div className="h-screen grid grid-cols-[auto_1fr] bg-white">
      <Sidebar currentThreadId={threadId} onNewChat={() => {
        setThreadId(null)
        setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: 'Hi! Describe a video you want to generate.' }])
        setInput('')
      }} onSelectThread={async (tid) => {
        setThreadId(tid)
        const res = await axios.get(`/aivideo/api/threads/${tid}`)
        const threadMessages: ChatMessage[] = (res.data?.messages || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content }))
        setMessages(threadMessages.length ? threadMessages : [{ id: crypto.randomUUID(), role: 'assistant', content: 'Hi! Describe a video you want to generate.' }])
      }} />
      <div className="flex flex-col min-w-0">
        {header}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-violet-50/40 thin-scrollbar">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              videoUrl={m.videoUrl}
              onEdit={m.videoUrl ? () => {
                const params = new URLSearchParams()
                if (threadId) params.set('threadId', threadId)
                params.set('messageId', m.id)
                params.set('videoUrl', m.videoUrl)
                location.href = `/aivideo/editor?${params.toString()}`
              } : undefined}
            >{m.content}</MessageBubble>
          ))}
        </div>
        <div className="border-t border-violet-200 p-4 bg-white">
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <input
              className="flex-1"
              placeholder="Describe your video..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input) } }}
              disabled={loading}
            />
            <button className="primary" onClick={() => submit(input)} disabled={loading || !input.trim()}>{loading ? 'Generating...' : 'Send'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}


