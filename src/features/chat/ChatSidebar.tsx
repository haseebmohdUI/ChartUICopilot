import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '@/features/auth/authSlice'
import {
  newConversation,
  setActiveConversation,
  deleteConversation,
} from './chatSlice'
import type { RootState } from '@/app/store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function ChatSidebar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.auth.user)
  const conversations = useSelector((s: RootState) => s.chat.conversations)
  const activeId = useSelector((s: RootState) => s.chat.activeConversationId)

  return (
    <aside className="flex h-screen w-[300px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
      {/* New Chat button */}
      <div className="p-3">
        <Button
          onClick={() => dispatch(newConversation())}
          variant="outline"
          className="w-full justify-start gap-2 border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Chat
        </Button>
      </div>

      <Separator className="bg-zinc-200" />

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-3">
          {conversations.length === 0 ? (
            <p className="text-xs text-zinc-400">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center rounded-lg px-3 py-2 text-sm cursor-pointer ${
                  conv.id === activeId
                    ? 'bg-zinc-200 text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
                onClick={() => dispatch(setActiveConversation(conv.id))}
              >
                <span className="flex-1 truncate">{conv.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    dispatch(deleteConversation(conv.id))
                  }}
                  className="ml-2 hidden shrink-0 text-zinc-400 hover:text-red-500 group-hover:block"
                  title="Delete conversation"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Separator className="bg-zinc-200" />

      {/* User profile & logout */}
      <div className="flex items-center gap-2 p-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-sm text-zinc-600">
          {user?.email?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-zinc-700">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch(logout())}
          className="h-8 w-8 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          title="Logout"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </Button>
      </div>
    </aside>
  )
}
