import { useCallback, useState } from 'react'
import type { HistoryEntry } from '../types'

const STORAGE_KEY = 'monkeyap-history'
const MAX_ENTRIES = 50

function load(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

function save(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch { /* storage full — silently ignore */ }
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(load)

  const addEntry = useCallback((entry: Omit<HistoryEntry, 'id' | 'date'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id:   Date.now().toString(),
      date: new Date().toISOString(),
    }
    setEntries(prev => {
      const updated = [newEntry, ...prev].slice(0, MAX_ENTRIES)
      save(updated)
      return updated
    })
  }, [])

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id)
      save(updated)
      return updated
    })
  }, [])

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setEntries([])
  }, [])

  const clearByLang = useCallback((lang: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => (e.language ?? 'pt') !== lang)
      save(updated)
      return updated
    })
  }, [])

  return { entries, addEntry, removeEntry, clearHistory, clearByLang }
}
