import type { Group, GroupDetail, GroupSummary } from '../types/domain'
import { http } from './client'

export const listMyGroups = () => http.get<GroupSummary[]>('/groups')
export const getGroup = (id: string) => http.get<GroupDetail>(`/groups/${id}`)
export const createGroup = (name: string) => http.post<Group>('/groups', { name })
export const joinGroup = (code: string) => http.post<Group>('/groups/join', { code })
export const renameGroup = (id: string, name: string) => http.patch<Group>(`/groups/${id}`, { name })
export const deleteGroup = (id: string) => http.del(`/groups/${id}`)
/** Leaving also removes your builds' shares with this group (FR 5.1). */
export const leaveGroup = (id: string) => http.post<void>(`/groups/${id}/leave`)
export const kickMember = (id: string, userId: string) => http.del(`/groups/${id}/members/${userId}`)
export const transferOwner = (id: string, userId: string) => http.post<void>(`/groups/${id}/transfer`, { userId })
export const regenerateInvite = (id: string) => http.post<{ inviteCode: string }>(`/groups/${id}/invite-code`)
export const setBuildHidden = (id: string, buildId: string, hidden: boolean) =>
  http.put<void>(`/groups/${id}/builds/${buildId}/hidden`, { hidden })
