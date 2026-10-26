import { useEffect, useState } from "react";
import { fetchProgress, submitLessonAnswers, type LessonAnswers, type Progress } from "../account/api";
import { useAuth } from "../account/authContext";
import { getStreak, recordCompletionToday } from "./streak";

/**
 * The learner's streak, and recording a finished lesson. A guest's streak lives in this
 * browser only; a signed-in learner's answers go to the server, which grades them and
 * keeps the streak in their account.
 */
export function useLessonProgress() {
  const { user } = useAuth();
  const [localStreak, setLocalStreak] = useState(() => getStreak().currentStreak);
  const [server, setServer] = useState<Progress | null>(null);
  const [saved, setSaved] = useState<"no" | "yes" | "failed">("no");

  useEffect(() => {
    if (user) fetchProgress().then(setServer, () => {});
  }, [user]);

  async function record(answers: LessonAnswers) {
    setLocalStreak(recordCompletionToday().currentStreak);
    if (!user) return;
    try {
      setServer(await submitLessonAnswers(answers));
      setSaved("yes");
    } catch {
      setSaved("failed");
    }
  }

  return {
    signedIn: user !== null,
    streak: user ? (server?.currentStreak ?? 0) : localStreak,
    saved,
    record,
  };
}
