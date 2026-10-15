/** Coalesce high-frequency handlers (scroll/resize) to one paint per frame — lowers INP. */
export function rafThrottle<T extends (...args: never[]) => void>(fn: T): T {
  let ticking = false;
  let lastArgs: Parameters<T> | null = null;

  const run = () => {
    ticking = false;
    if (lastArgs) fn(...lastArgs);
  };

  return ((...args: Parameters<T>) => {
    lastArgs = args;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(run);
    }
  }) as T;
}
