import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={
            isUser
              ? 'bg-blue-500 text-white text-sm'
              : 'bg-zinc-500 text-zinc-100 text-sm'
          }
        >
          {isUser ? 'U' : 'AI'}
        </AvatarFallback>
      </Avatar>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-zinc-600 text-zinc-100'
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}
