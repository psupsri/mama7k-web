// In-memory mock database persisted to localStorage so changes survive reloads.
import { createSeed, DB_VERSION, type MockDB } from './seed'

const DB_KEY = 'mama7k.mockdb'
const SESSION_KEY = 'mama7k.session'

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // storage unavailable (private mode) – keep working in memory
  }
}

function load(): MockDB {
  const raw = safeGet(DB_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as MockDB
      if (parsed.version === DB_VERSION) return parsed
    } catch {
      // fall through to a fresh seed
    }
  }
  return createSeed()
}

export const db: MockDB = load()

export function persist() {
  safeSet(DB_KEY, JSON.stringify(db))
}

export function resetDb() {
  Object.assign(db, createSeed())
  persist()
}

export function nextId(prefix: string) {
  db.seq += 1
  return `${prefix}${db.seq}`
}

// ---- Session (stands in for the auth cookie the Go API will set) ----

let sessionUserId: string | null = safeGet(SESSION_KEY)

export function getSessionUserId() {
  return sessionUserId
}

export function setSessionUserId(id: string | null) {
  sessionUserId = id
  safeSet(SESSION_KEY, id)
}
