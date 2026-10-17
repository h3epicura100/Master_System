import { useEffect, useRef, useState, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import { toast } from 'sonner';

/**
 * Background notification scheduler hook.
 * Strictly guarded against infinite loops.
 */
export function useNotificationScheduler({ enabled = false } = {}) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState(null);
  const isCheckingRef = useRef(false);
  const hasRunInitialRef = useRef(false);

  const runCheck = useCallback(async ({ manual = false, force = false } = {}) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsChecking(true);

    try {
      console.log(`[NotificationScheduler] Executing delay check (manual: ${manual}, force: ${force})...`);
      const result = await notificationService.checkAndSendDelayAlerts({ force });
      setLastCheckResult(result);

      if (manual) {
        if (result.sentCount > 0) {
          toast.success(`Delay check completed: sent ${result.sentCount} WhatsApp alert(s).`);
        } else if (result.delayedCount > 0) {
          toast.info(`Found ${result.delayedCount} delayed task(s). No new alerts due in this window.`);
        } else {
          toast.info('All department tasks are on track! No delays found.');
        }
      }
      return result;
    } catch (err) {
      console.error('[NotificationScheduler] Error during delay check:', err);
      if (manual) {
        toast.error('Failed to execute delay check: ' + (err.message || 'Unknown error'));
      }
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // DISABLE auto-running in frontend background to prevent any uncontrolled loops.
    // The scheduler will run via Supabase Edge Function / pg_cron, or manual click in Settings.
    if (!enabled) return;

    // Optional 30-minute interval, only if not already running
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;
    const interval = setInterval(() => {
      runCheck({ manual: false, force: false });
    }, THIRTY_MINUTES_MS);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, runCheck]);

  return {
    isChecking,
    lastCheckResult,
    triggerCheckNow: (force = false) => runCheck({ manual: true, force }),
  };
}
