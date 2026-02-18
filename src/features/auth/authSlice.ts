import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  isAuthenticated: boolean
  user: { email: string } | null
  error: string | null
}

const persisted = localStorage.getItem('auth')
const initialState: AuthState = persisted
  ? JSON.parse(persisted)
  : { isAuthenticated: false, user: null, error: null }

const VALID_EMAIL = 'hmohammed@ahrinet.org'
const VALID_PASSWORD = 'AHRI@2023'

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(state, action: PayloadAction<{ email: string; password: string }>) {
      const { email, password } = action.payload
      if (email === VALID_EMAIL && password === VALID_PASSWORD) {
        state.isAuthenticated = true
        state.user = { email }
        state.error = null
      } else {
        state.isAuthenticated = false
        state.user = null
        state.error = 'Invalid email or password'
      }
    },
    logout(state) {
      state.isAuthenticated = false
      state.user = null
      state.error = null
    },
    clearError(state) {
      state.error = null
    },
  },
})

export const { login, logout, clearError } = authSlice.actions
export default authSlice.reducer
