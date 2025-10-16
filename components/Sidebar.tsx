import { useEffect, useState } from 'react'
import axios from 'axios'

type SidebarProps = {
  onSelectThread: (threadId: string) => void
  onNewChat: () => void
  currentThreadId?: string | null
}

type Thread = { threadId: string; title: string; updatedAt: string }

export default function Sidebar({ onSelectThread, onNewChat, currentThreadId }: SidebarProps) {
  const [threads, setThreads] = useState<Thread[]>([])

  useEffect(() => {
    let mounted = true
    axios.get('/aivideo/api/threads').then(res => { if (mounted) setThreads(res.data.threads || []) })
    return () => { mounted = false }
  }, [])

  return (
    <aside className="w-72 border-r border-violet-200 hidden md:flex flex-col bg-white">
      <div className="p-4 sticky top-0 bg-white border-b border-violet-200 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-neutral-700">History</div>
          <button
            className="text-xs h-8 px-3 rounded-lg border border-violet-200 hover:bg-violet-50"
            onClick={() => onNewChat()}
          >New</button>
        </div>
        <input
          className="w-full h-10 text-sm"
          placeholder="Search chats..."
          onChange={(e) => {
            const q = e.target.value.toLowerCase()
            setThreads(prev => prev.filter(t => !q || t.title.toLowerCase().includes(q)))
          }}
        />
      </div>
      <div className="p-3 space-y-2 overflow-y-auto thin-scrollbar">
        {threads.map(t => (
          <button
            key={t.threadId}
            className={`w-full text-left p-3 rounded-lg border border-violet-200 hover:bg-violet-50 transition ${currentThreadId === t.threadId ? 'bg-violet-50' : 'bg-white'}`}
            onClick={() => onSelectThread(t.threadId)}
            title={new Date(t.updatedAt).toLocaleString()}
          >
            <div className="text-sm font-medium text-neutral-800 truncate">{t.title}</div>
            <div className="text-[11px] text-neutral-500">{new Date(t.updatedAt).toLocaleString()}</div>
          </button>
        ))}
        {threads.length === 0 && (
          <div className="text-xs text-neutral-400">No chats yet</div>
        )}
      </div>
    </aside>
  )
}


