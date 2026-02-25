import { useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/app/store'
import {
  startConversation,
  addMessage,
  updateMessageContent,
  setLoading,
  type Message,
} from './chatSlice'
import ChatSidebar from './ChatSidebar'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { ScrollArea } from '@/components/ui/scroll-area'
import rawDataFallback from '../../../rawDataV2.json'

export default function ChatPage() {
  const dispatch = useDispatch()
  const activeId = useSelector((s: RootState) => s.chat.activeConversationId)
  const conversation = useSelector((s: RootState) =>
    s.chat.conversations.find((c) => c.id === activeId),
  )
  const messages = conversation?.messages ?? []
  const loading = useSelector((s: RootState) => s.chat.loading)
  const bottomRef = useRef<HTMLDivElement>(null)

  const getData = (): Record<string, unknown> => {
    const stored = localStorage.getItem('chartai-json-data')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        // fall through
      }
    }
    return rawDataFallback as Record<string, unknown>
  }

  const data = getData()

  // Extract default question from the v2 payload's messages array
  const defaultQuestion =
    (data as { messages?: { content?: string }[] }).messages?.[0]?.content ?? ''

  const lastUserQuestionRef = useRef<string>('')

  const generateChart = async (question: string, chartTypeHint: string | null) => {
    dispatch(setLoading(true))
    const startTime = performance.now()

    const history = messages.map((m) => ({
      role: m.role === 'chartagent' ? 'assistant' : m.role,
      content: m.content,
    }))

    const finalQuestion = chartTypeHint
      ? `${question} Use a ${chartTypeHint}.`
      : question

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: finalQuestion, data, messages: history }),
      })

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }

      const body = await res.json()
      const durationMs = Math.round(performance.now() - startTime)
      const agentMsg: Message = {
        id: crypto.randomUUID(),
        role: 'chartagent',
        content: body.text || '',
        jsx: body.jsx || undefined,
        durationMs,
      }
      dispatch(addMessage(agentMsg))
    } catch (e) {
      const durationMs = Math.round(performance.now() - startTime)
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'chartagent',
        content: `Error: ${(e as Error).message}`,
        durationMs,
      }
      dispatch(addMessage(errorMsg))
    } finally {
      dispatch(setLoading(false))
    }
  }

  const handleSend = async (content: string) => {
    const question = content || defaultQuestion
    if (!question) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
    }

    if (!activeId) {
      dispatch(startConversation(userMsg))
    } else {
      dispatch(addMessage(userMsg))
    }

    lastUserQuestionRef.current = question
    await generateChart(question, null)
  }

  const handlePickRecommendation = async (chartType: string | null) => {
    const question = lastUserQuestionRef.current
    if (!question) return
    await generateChart(question, chartType)
  }

  const handleChartData = async (
    messageId: string,
    chartData: Record<string, unknown>[],
  ) => {
    const question = lastUserQuestionRef.current
    if (!question || !chartData.length) return

    try {
      const res = await fetch('/api/chat/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, chartData }),
      })
      if (res.ok) {
        const body = await res.json()
        if (body.text) {
          dispatch(updateMessageContent({ messageId, content: body.text }))
        }
      }
    } catch {
      // Summarize failed — keep whatever text the chart message already has
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-screen bg-white">
      <ChatSidebar />

      <main className="flex min-h-0 flex-1 flex-col">
        {/* Message area */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto max-w-3xl px-4 py-8">
            {messages.length === 0 ? (
              <div className="flex h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                  <svg
                    className="h-8 w-8 text-zinc-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                    />
                  </svg>
                </div>
                <h2 className="mb-2 text-xl font-semibold text-zinc-800">
                  ChartAI
                </h2>
                <p className="max-w-sm text-sm text-zinc-500">
                  Describe the data chart you'd like to create. I can generate
                  bar charts, pie charts, line charts, and more.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    data={data}
                    onPickRecommendation={handlePickRecommendation}
                    onChartData={handleChartData}
                    isLastMessage={idx === messages.length - 1}
                  />
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 shrink-0" />
                    <div className="rounded-2xl bg-zinc-100 px-4 py-2.5 text-sm text-zinc-500">
                      <span className="inline-flex gap-1">
                        <span className="animate-bounce">.</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input bar */}
        <ChatInput onSend={handleSend} disabled={loading} />
      </main>
    </div>
  )
}
