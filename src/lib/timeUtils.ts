/**
 * Generate a live relative timestamp from a fixed offset in minutes.
 * This makes timestamps feel "live" — they update on each render.
 */
export function getRelativeTime(minutesAgo: number): string {
  if (minutesAgo < 1) return "Just Now";
  if (minutesAgo < 60) return `${Math.round(minutesAgo)} Min Ago`;
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `${hours} Hour${hours > 1 ? "s" : ""} Ago`;
  const days = Math.floor(hours / 24);
  return `${days} Day${days > 1 ? "s" : ""} Ago`;
}

/**
 * Returns a formatted "live" date string like "Sunday, March 8, 2026 | 5:32 PM IST"
 */
export function getLiveDate(): string {
  const now = new Date();
  return now.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }) + " | " + now.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " IST";
}

/**
 * Shuffle array using Fisher-Yates, seeded by the current hour so it changes hourly
 */
export function hourlyShuffled<T>(arr: T[]): T[] {
  const seed = new Date().getHours();
  const result = [...arr];
  let m = result.length;
  let s = seed;
  while (m) {
    s = (s * 9301 + 49297) % 233280;
    const i = s % m--;
    [result[m], result[i]] = [result[i], result[m]];
  }
  return result;
}
