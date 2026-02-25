import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface Message {
  id: string
  role: 'user' | 'chartagent'
  content: string
  jsx?: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  loading: boolean
}

function loadState(): ChatState {
  try {
    const raw = localStorage.getItem('chat')
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        conversations: parsed.conversations ?? [],
        activeConversationId: parsed.activeConversationId ?? null,
        loading: false,
      }
    }
  } catch {
    // ignore
  }
  return { conversations: [], activeConversationId: null, loading: false }
}

const chatSlice = createSlice({
  name: 'chat',
  initialState: loadState(),
  reducers: {
    startConversation(state, action: PayloadAction<Message>) {
      const now = new Date().toISOString()
      const words = action.payload.content.trim().split(/\s+/)
      const title =
        action.payload.role === 'user'
          ? words.length > 5
            ? words.slice(0, 5).join(' ') + '...'
            : words.join(' ')
          : 'New Chat'
      const conv: Conversation = {
        id: crypto.randomUUID(),
        title,
        messages: [action.payload],
        createdAt: now,
        updatedAt: now,
      }
      state.conversations.unshift(conv)
      state.activeConversationId = conv.id
    },
    addMessage(state, action: PayloadAction<Message>) {
      const conv = state.conversations.find(
        (c) => c.id === state.activeConversationId,
      )
      if (conv) {
        conv.messages.push(action.payload)
        conv.updatedAt = new Date().toISOString()
      }
    },
    setActiveConversation(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
    deleteConversation(state, action: PayloadAction<string>) {
      state.conversations = state.conversations.filter(
        (c) => c.id !== action.payload,
      )
      if (state.activeConversationId === action.payload) {
        state.activeConversationId = state.conversations[0]?.id ?? null
      }
    },
    newConversation(state) {
      state.activeConversationId = null
    },
  },
})

export const {
  startConversation,
  addMessage,
  setActiveConversation,
  setLoading,
  deleteConversation,
  newConversation,
} = chatSlice.actions

export default chatSlice.reducer
