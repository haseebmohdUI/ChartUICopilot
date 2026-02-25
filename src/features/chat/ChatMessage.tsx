import { Component, useMemo, type ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import ReactMarkdown from 'react-markdown'
import { renderChart } from '@/lib/renderChart'

import type { Message, ChartRecommendation } from './chatSlice'
export type { Message } from './chatSlice'

const CHART_ICONS: Record<string, string> = {
  BarChart: '📊',
  LineChart: '📈',
  AreaChart: '📉',
  PieChart: '🥧',
  ScatterChart: '🔵',
  RadarChart: '🕸️',
  ComposedChart: '📊',
  RadialBarChart: '🎯',
}

function RecommendationButtons({
  recommendations,
  onPick,
  disabled,
}: {
  recommendations: ChartRecommendation[]
  onPick?: (chartType: string | null) => void
  disabled: boolean
}) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Suggested chart types</p>
      <div className="flex flex-wrap gap-2">
        {recommendations.map((rec) => (
          <button
            key={rec.chartType}
            disabled={disabled}
            onClick={() => onPick?.(rec.chartType)}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{CHART_ICONS[rec.chartType] ?? '📊'}</span>
            <span>
              <span className="font-medium text-zinc-800">{rec.chartType}</span>
              <span className="ml-1 text-zinc-500">— {rec.reason}</span>
            </span>
          </button>
        ))}
        <button
          disabled={disabled}
          onClick={() => onPick?.(null)}
          className="rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-500 transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Let AI decide
        </button>
      </div>
    </div>
  )
}

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
  onPickRecommendation,
  isLastMessage,
}: {
  message: Message
  data: Record<string, unknown>
  onPickRecommendation?: (chartType: string | null) => void
  isLastMessage?: boolean
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
            ? 'max-w-[70%] bg-zinc-200 text-zinc-800'
            : `bg-zinc-100 text-zinc-800 ${message.jsx ? 'max-w-full w-full' : 'max-w-[70%]'}`
        }`}
      >
        {message.content && (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {message.recommendations && message.recommendations.length > 0 && (
          <RecommendationButtons
            recommendations={message.recommendations}
            onPick={onPickRecommendation}
            disabled={!isLastMessage}
          />
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
