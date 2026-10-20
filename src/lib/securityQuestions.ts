/**
 * WEST MUN 2027 — Security Team Assessment Questions & Validation
 *
 * Mandatory long-answer scenario questions for candidates applying to the
 * Security team. Word counts are enforced on both the client (live counter,
 * submit guard) and server / database trigger.
 */

export interface SecurityQuestionDef {
  key: 'security_emergency_steps' | 'security_teamwork' | 'security_motivation' | 'security_handling_harassment';
  id: string;
  title: string;
  minWords: number;
  prompt: string;
}

export const SECURITY_QUESTIONS: SecurityQuestionDef[] = [
  {
    key: 'security_emergency_steps',
    id: 'emergency_problem_solving',
    title: 'Emergency Problem-Solving',
    minWords: 80,
    prompt:
      'At times when issues come up suddenly in the MUN (e.g., disagreements between two individuals or a medical emergency), what steps are you going to take to solve the problem? Please be detailed and thorough with your answer.',
  },
  {
    key: 'security_teamwork',
    id: 'teamwork_and_communication',
    title: 'Teamwork and Communication',
    minWords: 50,
    prompt: 'Tell us about your teamwork and communication in a team.',
  },
  {
    key: 'security_motivation',
    id: 'motivation',
    title: 'Motivation',
    minWords: 50,
    prompt: 'Why do you want to join the WEST MUN Security Team?',
  },
  {
    key: 'security_handling_harassment',
    id: 'handling_bullying_and_harassment',
    title: 'Handling Bullying and Harassment',
    minWords: 50,
    prompt:
      'What would be your immediate course of action if you witnessed a delegate or chair being bullied, mistreated, harassed, or made to feel unsafe during the conference?',
  },
];

/**
 * Standard word count function matching PostgreSQL regex-split semantics.
 * Strips leading/trailing whitespace and splits on one or more whitespace characters.
 */
export function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export interface SecurityAnswersPayload {
  security_emergency_steps: string;
  security_teamwork: string;
  security_motivation: string;
  security_handling_harassment: string;
}

export function validateSecurityAnswers(answers: Partial<SecurityAnswersPayload>): {
  valid: boolean;
  errors: Record<string, string>;
  counts: Record<string, number>;
} {
  const errors: Record<string, string> = {};
  const counts: Record<string, number> = {};

  for (const q of SECURITY_QUESTIONS) {
    const value = (answers[q.key] || '').trim();
    const words = countWords(value);
    counts[q.key] = words;

    if (!value) {
      errors[q.key] = `${q.title} is required (minimum ${q.minWords} words).`;
    } else if (words < q.minWords) {
      const remaining = q.minWords - words;
      errors[q.key] = `Answer is too short (${words} / ${q.minWords} words). Please add at least ${remaining} more word${remaining === 1 ? '' : 's'}.`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    counts,
  };
}
