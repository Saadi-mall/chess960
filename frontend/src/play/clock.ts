/** h:mm:ss, e.g. "0:05:00". */
export function formatClock(millis: number): string {
  const totalSeconds = Math.ceil(millis / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
