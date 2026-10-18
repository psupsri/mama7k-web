import type { User } from '../types/domain'
import { http } from './client'

/** The signed-in user, or null for guests. */
export const me = () => http.get<User | null>('/me')

export const login = (email: string, password: string) => http.post<User>('/auth/login', { email, password })

export const register = (email: string, password: string, displayName: string) =>
  http.post<User>('/auth/register', { email, password, displayName })

export const logout = () => http.post<void>('/auth/logout')

/** Confirms the token from the verification email link. */
export const verifyEmail = (token: string) => http.post<void>('/auth/verify-email', { token })

export const resendVerification = () => http.post<void>('/auth/resend-verification')

/** Always succeeds so the response does not reveal whether the email exists. */
export const requestPasswordReset = (email: string) => http.post<void>('/auth/password-reset', { email })

export const confirmPasswordReset = (token: string, password: string) =>
  http.post<void>('/auth/password-reset/confirm', { token, password })

export const updateProfile = (displayName: string) => http.patch<User>('/me', { displayName })

/** FR 2.1 – account deletion. */
export const deleteAccount = () => http.del('/me')
