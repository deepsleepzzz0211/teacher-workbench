import axios, { type AxiosError } from 'axios'

import type { ApiError } from '@tw/shared'

const TOKEN_KEY = 'tw_token'
export const UNAUTHORIZED_EVENT = 'tw:unauthorized'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export const api = axios.create({
  baseURL: '/api',
  timeout: 15_000,
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url ?? ''
    if (error.response?.status === 401 && !url.includes('/auth/login')) {
      clearToken()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined
    if (data?.message) return data.message
    if (error.code === 'ECONNABORTED') return '请求超时，请稍后重试'
    return `请求失败（${error.response?.status ?? '网络异常'}）`
  }
  return error instanceof Error ? error.message : '发生未知错误'
}
