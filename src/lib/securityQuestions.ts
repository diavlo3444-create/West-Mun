/**
 * WEST MUN 2027 — Security Team Assessment Questions & Validation
 *
 * Mandatory long-answer scenario questions for candidates applying to the
 * Security team. Word counts are enforced consistently across client,
 * server, and database triggers.
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
 * Canonical word counting function.
 * Splits trimmed text on whitespace (\s+) and filters out empty entries.
 * Handles multiple spaces, line breaks (\n, \r\n), tabs, and leading/trailing whitespace.
 */
export function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  // Strip zero-width and invisible characters
  const cleaned = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
  const trimmed = cleaned.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Returns accurate user feedback string matching requirement:
 * e.g. "78/80 words — please add 2 more words." or "80/80 words — minimum met ✓"
 */
export function getWordCountFeedback(currentWords: number, minWords: number): string {
  if (currentWords < minWords) {
    const remaining = minWords - currentWords;
    return `${currentWords}/${minWords} words — please add ${remaining} more word${remaining === 1 ? '' : 's'}.`;
  }
  return `${currentWords}/${minWords} words — minimum met ✓`;
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
    const value = answers[q.key] ?? '';
    const words = countWords(value);
    counts[q.key] = words;

    if (words < q.minWords) {
      errors[q.key] = getWordCountFeedback(words, q.minWords);
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    counts,
  };
}

/**
 * Formats all 4 answers into a structured text block for backward-compatible
 * persistence in existing text columns (e.g. statement) if dedicated columns
 * are missing or unmigrated in Supabase.
 */
export function formatSecurityAnswers(answers: Partial<SecurityAnswersPayload>): string {
  return [
    '=== SECURITY TEAM ASSESSMENT ===',
    '',
    `[Emergency Problem-Solving] (${countWords(answers.security_emergency_steps)} words):`,
    (answers.security_emergency_steps || '').trim(),
    '',
    `[Teamwork and Communication] (${countWords(answers.security_teamwork)} words):`,
    (answers.security_teamwork || '').trim(),
    '',
    `[Motivation] (${countWords(answers.security_motivation)} words):`,
    (answers.security_motivation || '').trim(),
    '',
    `[Handling Bullying and Harassment] (${countWords(answers.security_handling_harassment)} words):`,
    (answers.security_handling_harassment || '').trim(),
  ].join('\n');
}

/**
 * Extracts security answers from dedicated columns or from formatted statement fallback.
 */
export function extractSecurityAnswers(record: {
  security_emergency_steps?: string | null;
  security_teamwork?: string | null;
  security_motivation?: string | null;
  security_handling_harassment?: string | null;
  statement?: string | null;
}): SecurityAnswersPayload {
  let emergency = String(record.security_emergency_steps || '').trim();
  let teamwork = String(record.security_teamwork || '').trim();
  let motivation = String(record.security_motivation || '').trim();
  let harassment = String(record.security_handling_harassment || '').trim();

  // If dedicated columns are empty, attempt extracting from formatted statement
  if ((!emergency || !teamwork || !motivation || !harassment) && record.statement) {
    const stmt = record.statement;
    const emergencyMatch = stmt.match(/\[Emergency Problem-Solving\][^\n]*\n([\s\S]*?)(?=\n\[Teamwork and Communication\]|\n===|$)/);
    if (emergencyMatch && !emergency) emergency = emergencyMatch[1].trim();

    const teamworkMatch = stmt.match(/\[Teamwork and Communication\][^\n]*\n([\s\S]*?)(?=\n\[Motivation\]|\n===|$)/);
    if (teamworkMatch && !teamwork) teamwork = teamworkMatch[1].trim();

    const motivationMatch = stmt.match(/\[Motivation\][^\n]*\n([\s\S]*?)(?=\n\[Handling Bullying and Harassment\]|\n===|$)/);
    if (motivationMatch && !motivation) motivation = motivationMatch[1].trim();

    const harassmentMatch = stmt.match(/\[Handling Bullying and Harassment\][^\n]*\n([\s\S]*?)(?=\n===|$)/);
    if (harassmentMatch && !harassment) harassment = harassmentMatch[1].trim();
  }

  return {
    security_emergency_steps: emergency,
    security_teamwork: teamwork,
    security_motivation: motivation,
    security_handling_harassment: harassment,
  };
}
