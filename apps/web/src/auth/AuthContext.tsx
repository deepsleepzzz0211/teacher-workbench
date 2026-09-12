import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { AuthUser, LoginInput } from '@tw/shared'

import { UNAUTHORIZED_EVENT } from '@/api/client'
import { authApi } from '@/api/endpoints'
import { clearToken, getToken, setToken } from '@/api/client'

interface AuthContextValue {
  user: AuthUser | null
  ready: boolean
  isAdmin: boolean
  login: (input: LoginInput) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const bootstrap = async (): Promise<void> => {
      if (!getToken()) {
        setReady(true)
        return
      }
      try {
        const me = await authApi.me()
        if (!cancelled) setUser(me)
      } catch {
        clearToken()
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleUnauthorized = (): void => {
      clearToken()
      setUser(null)
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const login = useCallback(async (input: LoginInput): Promise<void> => {
    const result = await authApi.login(input)
    setToken(result.token)
    setUser(result.user)
  }, [])

  const logout = useCallback((): void => {
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, isAdmin: user?.role === 'dept_admin', login, logout }),
    [user, ready, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth 必须在 AuthProvider 内部使用')
  return context
}
