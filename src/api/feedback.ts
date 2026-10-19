import type { FeedbackKind } from '../types/domain'
import { http } from './client'

/** Open to everyone, guests included; signed-in senders are linked to their account. */
export const sendFeedback = (kind: FeedbackKind, message: string, contact: string, page: string) =>
  http.post<void>('/feedback', { kind, message, contact, page })
