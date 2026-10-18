import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as authApi from '../api/auth'
import * as buildsApi from '../api/builds'
import * as groupsApi from '../api/groups'
import * as lineupsApi from '../api/lineups'
import * as masterApi from '../api/master'
import type { BuildListQuery } from '../api/builds'
import type { MasterData, MasterItem } from '../types/domain'

export const qk = {
  me: ['me'] as const,
  master: ['master'] as const,
  lineups: (ids: string[]) => ['lineups', ids] as const,
  lineup: (id: string) => ['lineup', id] as const,
  lineupBuilds: (id: string, q: BuildListQuery) => ['lineupBuilds', id, q] as const,
  build: (id: string) => ['build', id] as const,
  myBuilds: ['myBuilds'] as const,
  groups: ['groups'] as const,
  group: (id: string) => ['group', id] as const,
}

export function useMe() {
  return useQuery({ queryKey: qk.me, queryFn: authApi.me })
}

type ById<T> = Record<string, T>

export interface MasterLookup extends MasterData {
  character: ById<MasterData['characters'][number]>
  skill: ById<MasterData['skills'][number]>
  pet: ById<MasterData['pets'][number]>
  set: ById<MasterData['sets'][number]>
  ring: ById<MasterData['rings'][number]>
  stat: ById<MasterData['stats'][number]>
}

function index<T extends MasterItem>(list: T[]): ById<T> {
  return Object.fromEntries(list.map((x) => [x.id, x]))
}

export function useMaster(): MasterLookup | undefined {
  const { data } = useQuery({ queryKey: qk.master, queryFn: masterApi.getMasterData, staleTime: Infinity })
  return useMemo(
    () =>
      data && {
        ...data,
        character: index(data.characters),
        skill: index(data.skills),
        pet: index(data.pets),
        set: index(data.sets),
        ring: index(data.rings),
        stat: index(data.stats),
      },
    [data],
  )
}

export function useLineups(characterIds: string[]) {
  return useQuery({ queryKey: qk.lineups(characterIds), queryFn: () => lineupsApi.listLineups({ characterIds }) })
}

export function useLineup(id: string | undefined) {
  return useQuery({ queryKey: qk.lineup(id ?? ''), queryFn: () => lineupsApi.getLineup(id!), enabled: !!id })
}

export function useLineupBuilds(id: string, q: BuildListQuery) {
  return useQuery({ queryKey: qk.lineupBuilds(id, q), queryFn: () => buildsApi.listBuildsForLineup(id, q) })
}

export function useBuild(id: string | undefined) {
  return useQuery({ queryKey: qk.build(id ?? ''), queryFn: () => buildsApi.getBuild(id!), enabled: !!id, retry: false })
}

export function useMyBuilds(enabled = true) {
  return useQuery({ queryKey: qk.myBuilds, queryFn: buildsApi.listMyBuilds, enabled })
}

export function useMyGroups(enabled = true) {
  return useQuery({ queryKey: qk.groups, queryFn: groupsApi.listMyGroups, enabled })
}

export function useGroup(id: string | undefined) {
  return useQuery({ queryKey: qk.group(id ?? ''), queryFn: () => groupsApi.getGroup(id!), enabled: !!id, retry: false })
}
