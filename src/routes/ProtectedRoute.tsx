import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import type { RootState } from '@/app/store'

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const isAuthenticated = useSelector(
    (s: RootState) => s.auth.isAuthenticated
  )

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <>{children}</>
}
