import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import * as groupsApi from '../api/groups'
import { Loading } from '../components/States'
import { useToast } from '../hooks/useToast'
import { errorMessage } from '../lib/errors'
import { RequireAuth } from './RequireAuth'

/** Landing page for invite links: /join/:code */
export function JoinPage() {
  return (
    <RequireAuth>
      <Join />
    </RequireAuth>
  )
}

function Join() {
  const { code = '' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    groupsApi
      .joinGroup(code)
      .then((g) => {
        qc.invalidateQueries()
        toast(`เข้าร่วม ${g.name} แล้ว`)
        nav(`/groups/${g.id}`, { replace: true })
      })
      .catch((e) => {
        toast(errorMessage(e), true)
        nav('/groups', { replace: true })
      })
  }, [code, nav, qc, toast])

  return (
    <div className="page">
      <Loading rows={1} />
    </div>
  )
}
