import type { Lesson } from "./types";

export async function fetchLesson(): Promise<Lesson> {
  const response = await fetch("/api/lessons/today");
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed: ${response.status}`);
  }
  return response.json();
}
