"use client"

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAuth(requireAuth = true) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, requireAuth, router])

  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isAdmin: session?.user?.role === 'ADMIN',
    isUser: session?.user?.role === 'USER'
  }
}

export function useRequireAuth() {
  return useAuth(true)
}

export function useRequireAdmin() {
  const auth = useAuth(true)
  const router = useRouter()

  useEffect(() => {
    if (auth.isAuthenticated && !auth.isAdmin) {
      router.push('/')
    }
  }, [auth.isAuthenticated, auth.isAdmin, router])

  return auth
}