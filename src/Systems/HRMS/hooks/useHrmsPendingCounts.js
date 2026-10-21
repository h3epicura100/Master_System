import { useEffect, useState } from 'react'
import { hrmsService, HRMS_DATA_CHANGED } from '../services/hrmsService'

/**
 * Pending advance / overtime counts for HRMS nav badges.
 * Pass employeeId to scope counts to one staff member (non-admins).
 * Refetches whenever any HRMS write happens or `refreshKey` changes.
 */
export function useHrmsPendingCounts({ enabled = true, employeeId = null, refreshKey } = {}) {
  const [counts, setCounts] = useState({})

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const load = () => {
      hrmsService.getPendingCounts(employeeId)
        .then((c) => { if (!cancelled) setCounts(c) })
        .catch((e) => console.warn('HRMS pending counts error:', e))
    }
    load()
    window.addEventListener(HRMS_DATA_CHANGED, load)
    return () => {
      cancelled = true
      window.removeEventListener(HRMS_DATA_CHANGED, load)
    }
  }, [enabled, employeeId, refreshKey])

  return counts
}
