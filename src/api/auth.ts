import type { User } from '../types/domain'
import { http } from './client'

/** The signed-in user, or null for guests. */
export const me = () => http.get<User | null>('/me')

export const login = (username: string, password: string) => http.post<User>('/auth/login', { username, password })

export const register = (username: string, password: string, displayName: string) =>
  http.post<User>('/auth/register', { username, password, displayName })

export const logout = () => http.post<void>('/auth/logout')

/** Signs out other devices; this one stays signed in. */
export const changePassword = (currentPassword: string, newPassword: string) =>
  http.post<User>('/me/password', { currentPassword, newPassword })

export const updateProfile = (displayName: string) => http.patch<User>('/me', { displayName })

/** FR 2.1 – account deletion. */
export const deleteAccount = () => http.del('/me')
