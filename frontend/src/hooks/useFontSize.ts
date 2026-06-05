import { useState, useEffect, useCallback } from 'react'

const SIZES = [13, 15, 16, 18, 20]
const DEFAULT_IDX = 2
const STORAGE_KEY = 'monkeyap-font-size'

function loadIdx(): number {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_IDX
  const idx = parseInt(raw, 10)
  return idx >= 0 && idx < SIZES.length ? idx : DEFAULT_IDX
}

export function useFontSize() {
  const [idx, setIdx] = useState(loadIdx)

  useEffect(() => {
    document.documentElement.style.fontSize = `${SIZES[idx]}px`
  }, [idx])

  const increase = useCallback(() => {
    setIdx(i => {
      const next = Math.min(i + 1, SIZES.length - 1)
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  const decrease = useCallback(() => {
    setIdx(i => {
      const next = Math.max(i - 1, 0)
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return {
    canIncrease: idx < SIZES.length - 1,
    canDecrease: idx > 0,
    increase,
    decrease,
  }
}
