import { useState, type FormEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { login, clearError } from './authSlice'
import type { RootState } from '@/app/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const dispatch = useDispatch()
  const { isAuthenticated, error } = useSelector((s: RootState) => s.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (isAuthenticated) return <Navigate to="/chat" replace />

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    dispatch(login({ email, password }))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md border-zinc-200 bg-white shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <svg
              className="h-6 w-6 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-zinc-800">
            ChartAI
          </CardTitle>
          <p className="text-sm text-zinc-500">Sign in to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm text-zinc-600" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) dispatch(clearError())
                }}
                className="border-zinc-300 bg-zinc-50 text-zinc-800 placeholder:text-zinc-400"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-600" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) dispatch(clearError())
                }}
                className="border-zinc-300 bg-zinc-50 text-zinc-800 placeholder:text-zinc-400"
                required
              />
            </div>
            <div className="flex justify-center">
              <Button
              type="submit"
              className="w-50 bg-zinc-800 text-white hover:bg-zinc-700"
              >
              Sign in
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
