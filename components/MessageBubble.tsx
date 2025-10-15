import type { ReactNode } from 'react'

type MessageBubbleProps = {
  role: 'user' | 'assistant' | 'system'
  children: ReactNode
  videoUrl?: string
}

export default function MessageBubble({ role, children, videoUrl }: MessageBubbleProps) {
  const isUser = role === 'user'
  const isAssistant = role === 'assistant'

  return (
    <div className={`w-full flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs">AI</div>
      )}
      <div
        className={`max-w-[70ch] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 shadow ${
          isUser
            ? 'bg-violet-600 text-white rounded-br-sm'
            : 'panel rounded-bl-sm'
        }`}
      >
        {children}
        {videoUrl && (
          <div className="mt-3">
            <video className="w-full rounded" controls src={videoUrl} />
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-xs">You</div>
      )}
    </div>
  )
}


