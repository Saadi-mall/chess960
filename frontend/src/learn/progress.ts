import { useState } from "react";
import { getStreak, recordCompletionToday } from "./streak";
import type { LessonResult } from "./types";

/** The learner's streak, and recording a finished lesson. Guests keep it in this browser. */
export function useLessonProgress() {
  const [streak, setStreak] = useState(() => getStreak().currentStreak);

  function record(result: LessonResult) {
    void result;
    setStreak(recordCompletionToday().currentStreak);
  }

  return { streak, record };
}
