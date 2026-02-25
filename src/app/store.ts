import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/features/auth/authSlice'
import chatReducer from '@/features/chat/chatSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
  },
})

store.subscribe(() => {
  const { auth, chat } = store.getState()
  localStorage.setItem('auth', JSON.stringify(auth))
  try {
    localStorage.setItem(
      'chat',
      JSON.stringify({
        conversations: chat.conversations,
        activeConversationId: chat.activeConversationId,
      }),
    )
  } catch {
    // localStorage full — save without JSX to preserve text history
    const lite = chat.conversations.map((c) => ({
      ...c,
      messages: c.messages.map(({ jsx: _, ...rest }) => rest),
    }))
    localStorage.setItem(
      'chat',
      JSON.stringify({
        conversations: lite,
        activeConversationId: chat.activeConversationId,
      }),
    )
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
