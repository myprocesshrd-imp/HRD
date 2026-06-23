

export interface SurveySession {
  surveyId: string;
  anonymous: boolean;
  userId?: string;
  profile: Record<string, string>;
  answers: Record<string, number | string | string[] | Record<string, string>>;
  feedback: Record<string, string>;
  startedAt: number;
  completedAt?: number;
}

function storageKey(surveyId: string, userId?: string) {
  return `hrpulse.survey.draft.${surveyId}.${userId ?? "anon"}`;
}

export function loadDraft(surveyId: string, userId?: string): SurveySession | null {
  try {
    const raw = localStorage.getItem(storageKey(surveyId, userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveDraft(session: SurveySession) {
  const key = storageKey(session.surveyId, session.userId);
  localStorage.setItem(key, JSON.stringify(session));
}

export function clearDraft(surveyId: string, userId?: string) {
  localStorage.removeItem(storageKey(surveyId, userId));
}

