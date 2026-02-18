import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '@/features/auth/authSlice'
import type { RootState } from '@/app/store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface ChatSidebarProps {
  onNewChat: () => void
}

export default function ChatSidebar({ onNewChat }: ChatSidebarProps) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((s: RootState) => s.auth.user)

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-zinc-600/50 bg-zinc-800">
      {/* New Chat button */}
      <div className="space-y-2 p-3">
        <Button
          onClick={onNewChat}
          variant="outline"
          className="w-full justify-start gap-2 border-zinc-500/40 bg-transparent text-zinc-200 hover:bg-zinc-700 hover:text-white"
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
        <Button
          onClick={() => navigate('/data')}
          variant="outline"
          className="w-full justify-start gap-2 border-zinc-500/40 bg-transparent text-zinc-200 hover:bg-zinc-700 hover:text-white"
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
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
            />
          </svg>
          Paste Data
        </Button>
      </div>

      <Separator className="bg-zinc-600/50" />

      {/* Conversation list placeholder */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-xs text-zinc-400">No conversations yet</p>
      </div>

      <Separator className="bg-zinc-600/50" />

      {/* User profile & logout */}
      <div className="flex items-center gap-2 p-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-600 text-sm text-zinc-200">
          {user?.email?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-zinc-200">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch(logout())}
          className="h-8 w-8 text-zinc-400 hover:bg-zinc-700 hover:text-white"
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
