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
  const [allThreads, setAllThreads] = useState<Thread[]>([])

  useEffect(() => {
    let mounted = true
    axios.get('/aivideo/api/threads').then(res => { if (mounted) { setThreads(res.data.threads || []); setAllThreads(res.data.threads || []) } })
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
            setThreads((q ? allThreads.filter(t => t.title.toLowerCase().includes(q)) : allThreads))
          }}
        />
      </div>
      <div className="p-3 space-y-2 overflow-y-auto thin-scrollbar">
        {threads.map(t => (
          <div key={t.threadId} className={`w-full p-2 rounded-lg border border-violet-200 ${currentThreadId === t.threadId ? 'bg-violet-50' : 'bg-white'}`}>
            <div className="flex items-center gap-2">
              <button
                className="flex-1 text-left p-1 rounded hover:bg-violet-50"
                onClick={() => onSelectThread(t.threadId)}
                title={new Date(t.updatedAt).toLocaleString()}
              >
                <div className="text-sm font-medium text-neutral-800 truncate">{t.title}</div>
                <div className="text-[11px] text-neutral-500">{new Date(t.updatedAt).toLocaleString()}</div>
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 border border-transparent hover:border-red-200 text-red-600"
                onClick={async () => {
                  if (!confirm('Delete this chat?')) return
                  await axios.delete(`/aivideo/api/threads/${t.threadId}`)
                  setThreads(prev => prev.filter(x => x.threadId !== t.threadId))
                  setAllThreads(prev => prev.filter(x => x.threadId !== t.threadId))
                }}
                aria-label={`Delete ${t.title}`}
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M3 6h18" />
                  <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
                  <path d="M6 6l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        {threads.length === 0 && (
          <div className="text-xs text-neutral-400">No chats yet</div>
        )}
      </div>
    </aside>
  )
}


