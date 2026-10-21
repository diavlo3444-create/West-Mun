/**
 * WEST MUN 2027 — Volunteer Team Assessment Questions & Validation
 *
 * Mandatory scenario and competency questions for candidates applying to the
 * Volunteers team:
 * 1. Special Skills & Contribution
 * 2. Teamwork & Accountability (Teammate not pulling weight)
 * 3. Emergency & Conflict Reaction (Sudden medical emergency or argument)
 * 4. Professionalism with Delegates (Difficult or unresponsive delegates)
 */

import { countWords } from './securityQuestions';

export interface VolunteerQuestionDef {
  key:
    | 'volunteer_special_skills'
    | 'volunteer_teamwork_conflict'
    | 'volunteer_emergency_reaction'
    | 'volunteer_delegate_professionalism';
  id: string;
  title: string;
  prompt: string;
  minWords?: number;
}

export const VOLUNTEER_QUESTIONS: VolunteerQuestionDef[] = [
  {
    key: 'volunteer_special_skills',
    id: 'special_skills',
    title: 'Special Skills & Contribution',
    minWords: 1,
    prompt:
      "What special skills do you have that set you apart, and how will they contribute to the event's success?",
  },
  {
    key: 'volunteer_teamwork_conflict',
    id: 'teamwork_conflict',
    title: 'Team Dynamics & Accountability',
    minWords: 1,
    prompt: 'One of your teammates is not pulling their weight during the event. How do you handle it?',
  },
  {
    key: 'volunteer_emergency_reaction',
    id: 'emergency_reaction',
    title: 'Emergency & Conflict Reaction',
    minWords: 1,
    prompt:
      'If a sudden issue occurs during the event, such as a medical emergency or physical argument, how would you react?',
  },
  {
    key: 'volunteer_delegate_professionalism',
    id: 'delegate_professionalism',
    title: 'Professionalism with Delegates',
    minWords: 1,
    prompt: 'How would you stay professional if delegates were difficult or unresponsive?',
  },
];

export interface VolunteerAnswersPayload {
  volunteer_special_skills: string;
  volunteer_teamwork_conflict: string;
  volunteer_emergency_reaction: string;
  volunteer_delegate_professionalism: string;
}

/**
 * Returns accurate user feedback string for volunteer questions.
 */
export function getVolunteerWordCountFeedback(currentWords: number): string {
  if (currentWords < 1) {
    return 'Required response';
  }
  return `${currentWords} word${currentWords === 1 ? '' : 's'} ✓`;
}

export function validateVolunteerAnswers(answers: Partial<VolunteerAnswersPayload>): {
  valid: boolean;
  errors: Record<string, string>;
  counts: Record<string, number>;
} {
  const errors: Record<string, string> = {};
  const counts: Record<string, number> = {};

  for (const q of VOLUNTEER_QUESTIONS) {
    const value = (answers[q.key] ?? '').trim();
    const words = countWords(value);
    counts[q.key] = words;

    if (words < 1) {
      errors[q.key] = 'Please provide a detailed response to this required question.';
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
export function formatVolunteerAnswers(answers: Partial<VolunteerAnswersPayload>): string {
  return [
    '=== VOLUNTEER TEAM ASSESSMENT ===',
    '',
    `[Special Skills & Contribution] (${countWords(answers.volunteer_special_skills)} words):`,
    (answers.volunteer_special_skills || '').trim(),
    '',
    `[Team Dynamics & Accountability] (${countWords(answers.volunteer_teamwork_conflict)} words):`,
    (answers.volunteer_teamwork_conflict || '').trim(),
    '',
    `[Emergency & Conflict Reaction] (${countWords(answers.volunteer_emergency_reaction)} words):`,
    (answers.volunteer_emergency_reaction || '').trim(),
    '',
    `[Professionalism with Delegates] (${countWords(answers.volunteer_delegate_professionalism)} words):`,
    (answers.volunteer_delegate_professionalism || '').trim(),
  ].join('\n');
}

/**
 * Extracts volunteer answers from dedicated columns or from formatted statement fallback.
 */
export function extractVolunteerAnswers(record: any): VolunteerAnswersPayload {
  let skills = String(record?.volunteer_special_skills || '').trim();
  let teamwork = String(record?.volunteer_teamwork_conflict || '').trim();
  let emergency = String(record?.volunteer_emergency_reaction || '').trim();
  let professionalism = String(record?.volunteer_delegate_professionalism || '').trim();

  // If dedicated columns are empty, attempt extracting from formatted statement
  if ((!skills || !teamwork || !emergency || !professionalism) && record?.statement) {
    const stmt = record.statement;

    const skillsMatch = stmt.match(
      /\[Special Skills & Contribution\][^\n]*\n([\s\S]*?)(?=\n\[Team Dynamics & Accountability\]|\n===|$)/
    );
    if (skillsMatch && !skills) skills = skillsMatch[1].trim();

    const teamworkMatch = stmt.match(
      /\[Team Dynamics & Accountability\][^\n]*\n([\s\S]*?)(?=\n\[Emergency & Conflict Reaction\]|\n===|$)/
    );
    if (teamworkMatch && !teamwork) teamwork = teamworkMatch[1].trim();

    const emergencyMatch = stmt.match(
      /\[Emergency & Conflict Reaction\][^\n]*\n([\s\S]*?)(?=\n\[Professionalism with Delegates\]|\n===|$)/
    );
    if (emergencyMatch && !emergency) emergency = emergencyMatch[1].trim();

    const profMatch = stmt.match(/\[Professionalism with Delegates\][^\n]*\n([\s\S]*?)(?=\n===|$)/);
    if (profMatch && !professionalism) professionalism = profMatch[1].trim();
  }

  return {
    volunteer_special_skills: skills,
    volunteer_teamwork_conflict: teamwork,
    volunteer_emergency_reaction: emergency,
    volunteer_delegate_professionalism: professionalism,
  };
}
