import { useEffect, useRef } from "react";

/**
 * Headless countdown timer.
 * Uses refs for callbacks so the interval NEVER restarts mid-count.
 *
 * Props:
 *   seconds   — total seconds to count down from
 *   onTick    — called every second with remaining seconds
 *   onExpire  — called when timer hits 0
 */
export default function Timer({ seconds, onTick, onExpire }) {
  // Keep latest callbacks in refs — never stale, never cause re-run
  const onTickRef   = useRef(onTick);
  const onExpireRef = useRef(onExpire);
  onTickRef.current   = onTick;
  onExpireRef.current = onExpire;

  useEffect(() => {
    let remaining = seconds;

    const id = setInterval(() => {
      remaining -= 1;
      onTickRef.current?.(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        onExpireRef.current?.();
      }
    }, 1000);

    return () => clearInterval(id);
    // Only restart if the initial `seconds` value changes (i.e. new battle)
  }, [seconds]);

  return null;
}
