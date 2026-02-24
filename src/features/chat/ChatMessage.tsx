import { Component, useMemo, type ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import ReactMarkdown from 'react-markdown'
import { renderChart } from '@/lib/renderChart'

import type { Message } from './chatSlice'
export type { Message } from './chatSlice'

class ChartErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null }

  static getDerivedStateFromError(err: Error) {
    return { error: err.message }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg bg-red-800/30 px-4 py-3 text-sm text-red-200">
          Chart render error: {this.state.error}
        </div>
      )
    }
    return this.props.children
  }
}

function ChartRenderer({
  jsx,
  data,
}: {
  jsx: string
  data: Record<string, unknown>
}) {
  const result = useMemo(() => {
    try {
      const el = renderChart(jsx, data)
      return { element: el, error: null }
    } catch (e) {
      const msg = (e as Error).message
      console.error('[ChartRenderer] Error:', msg)
      return { element: null, error: msg }
    }
  }, [jsx, data])

  if (result.error) {
    return (
      <div className="rounded-lg bg-red-800/30 px-4 py-3 text-sm text-red-200">
        Chart transform error: {result.error}
      </div>
    )
  }

  return <>{result.element}</>
}

export default function ChatMessage({
  message,
  data,
}: {
  message: Message
  data: Record<string, unknown>
}) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={
            isUser
              ? 'bg-blue-500 text-white text-sm'
              : 'bg-zinc-200 text-zinc-600 text-sm'
          }
        >
          {isUser ? 'U' : 'AI'}
        </AvatarFallback>
      </Avatar>
      <div
        className={`min-w-0 rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'max-w-[70%] bg-blue-500 text-white'
            : `bg-zinc-100 text-zinc-800 ${message.jsx ? 'max-w-full w-full' : 'max-w-[70%]'}`
        }`}
      >
        {message.content && (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {message.jsx && (
          <ChartErrorBoundary>
            <div className="mt-3 rounded-lg bg-white p-4" style={{ width: '100%', minHeight: 420 }}>
              <ChartRenderer jsx={message.jsx} data={data} />
            </div>
          </ChartErrorBoundary>
        )}
      </div>
    </div>
  )
}
