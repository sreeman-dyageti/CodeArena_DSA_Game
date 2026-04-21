import { useEffect, useRef } from "react";

/**
 * Countdown timer.
 * Props:
 *   seconds      — initial seconds (e.g. 900 for 15 min)
 *   onTick       — called every second with remaining seconds
 *   onExpire     — called when timer hits 0
 */
export default function Timer({ seconds, onTick, onExpire }) {
  const remaining = useRef(seconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    remaining.current = seconds;

    intervalRef.current = setInterval(() => {
      remaining.current -= 1;
      onTick?.(remaining.current);
      if (remaining.current <= 0) {
        clearInterval(intervalRef.current);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [seconds, onTick, onExpire]);

  return null; // headless — display is handled by parent
}
