import { useEffect, useMemo, useState } from "react"
import { loadRomanizer, needsRomanization, sortKey } from "../utils/romanize"
import type { Romanizer } from "../utils/romanize"

// Returns the key used to order a name. The romanization libraries are fetched only once a record
// actually contains Japanese, Chinese or Korean text; until then such text keeps its plain order.
export function useSortKey(texts: string[]) {
  const [romanizer, setRomanizer] = useState<Romanizer | null>(null)
  const needed = texts.some(needsRomanization)

  useEffect(() => {
    if (!needed || romanizer) return
    let cancelled = false
    loadRomanizer()
      .then((loaded) => { if (!cancelled) setRomanizer(() => loaded) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [needed, romanizer])

  return useMemo(() => {
    const cache = new Map<string, string>()
    return (text: string) => {
      let key = cache.get(text)
      if (key === undefined) {
        key = sortKey(text, romanizer)
        cache.set(text, key)
      }
      return key
    }
  }, [romanizer])
}
