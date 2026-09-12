import { z } from 'zod'

import { ROLES, type Role } from '../constants'

export const loginSchema = z.object({
  username: z.string().trim().min(1, '请输入用户名').max(50),
  password: z.string().min(1, '请输入密码').max(100),
})
export type LoginInput = z.infer<typeof loginSchema>

export interface AuthUser {
  id: string
  username: string
  name: string
  employeeNo: string
  department: string
  title: string
  role: Role
  email: string | null
  phone: string | null
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export const roleSchema = z.enum(ROLES)
