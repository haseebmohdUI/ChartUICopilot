import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/features/auth/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
})

store.subscribe(() => {
  const { auth } = store.getState()
  localStorage.setItem('auth', JSON.stringify(auth))
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
