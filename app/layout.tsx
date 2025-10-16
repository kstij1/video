import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'AI Video Gen',
  description: 'Generate videos with Runway (no auth)',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900">
        <div className="fixed bottom-3 right-3 z-50 text-[11px] text-neutral-500">AI Video Studio</div>
        {children}
      </body>
    </html>
  )
}


