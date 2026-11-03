/**
 * WEST MUN 2027 — Applicant Profile & Emergency Contact Utilities
 * Extracts newly added candidate questions (Gender, DOB, Education level,
 * Emergency contact & relationship, Guardian phone, Attendance, Certificates, Medical notes)
 * from direct columns or from the structured profile text block.
 */

export interface ApplicantProfileDetails {
  gender?: string;
  dateOfBirth?: string;
  educationLevel?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  attendanceAvailability?: string;
  certificates?: string;
  medicalNotes?: string;
}

export function extractApplicantProfile(record: any): ApplicantProfileDetails {
  const details: ApplicantProfileDetails = {};

  // 1. Direct column properties if available
  if (record?.gender) details.gender = String(record.gender);
  if (record?.dob || record?.date_of_birth) details.dateOfBirth = String(record.dob || record.date_of_birth);
  if (record?.education_level) details.educationLevel = String(record.education_level);
  if (record?.guardian_name) details.guardianName = String(record.guardian_name);
  if (record?.guardian_relationship) details.guardianRelationship = String(record.guardian_relationship);
  if (record?.guardian_phone) details.guardianPhone = String(record.guardian_phone);
  if (record?.attendance_availability) details.attendanceAvailability = String(record.attendance_availability);
  if (record?.certificates_detail) details.certificates = String(record.certificates_detail);
  if (record?.medical_detail) details.medicalNotes = String(record.medical_detail);

  // 2. Extract from formatted statement if direct fields are empty
  const stmt = String(record?.statement || '');
  if (stmt.includes('=== CANDIDATE PROFILE & EMERGENCY CONTACT ===')) {
    const genderMatch = stmt.match(/Gender:\s*([^\n]+)/i);
    if (genderMatch && !details.gender) details.gender = genderMatch[1].trim();

    const dobMatch = stmt.match(/Date of Birth:\s*([^\n]+)/i);
    if (dobMatch && !details.dateOfBirth) details.dateOfBirth = dobMatch[1].trim();

    const eduMatch = stmt.match(/Education Level:\s*([^\n]+)/i);
    if (eduMatch && !details.educationLevel) details.educationLevel = eduMatch[1].trim();

    const contactMatch = stmt.match(/Emergency Contact:\s*([^(]+)\(([^)]+)\)/i);
    if (contactMatch) {
      if (!details.guardianName) details.guardianName = contactMatch[1].trim();
      if (!details.guardianRelationship) details.guardianRelationship = contactMatch[2].trim();
    } else {
      const plainContact = stmt.match(/Emergency Contact:\s*([^\n]+)/i);
      if (plainContact && !details.guardianName) details.guardianName = plainContact[1].trim();
    }

    const phoneMatch = stmt.match(/Emergency Phone:\s*([^\n]+)/i);
    if (phoneMatch && !details.guardianPhone) details.guardianPhone = phoneMatch[1].trim();

    const availMatch = stmt.match(/Attendance Availability:\s*([^\n]+)/i);
    if (availMatch && !details.attendanceAvailability) details.attendanceAvailability = availMatch[1].trim();

    const certMatch = stmt.match(/Certificates:\s*([^\n]+)/i);
    if (certMatch && !details.certificates) details.certificates = certMatch[1].trim();

    const medMatch = stmt.match(/Medical Notes:\s*([^\n]+)/i);
    if (medMatch && !details.medicalNotes) details.medicalNotes = medMatch[1].trim();
  }

  return details;
}

export function stripProfileMarker(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/=== CANDIDATE PROFILE & EMERGENCY CONTACT ===[\s\S]*?==============================================\n*/g, '')
    .trim();
}
