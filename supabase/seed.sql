-- =====================================================================
-- WEST MUN — starting content (exactly what the website showed before
-- the admin panel existed). Run AFTER schema.sql.
--
-- Safe to run more than once: a table that already has rows is left
-- alone, and settings that already exist keep their current value.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------
insert into public.settings (key, value) values
  -- general
  ('conference_dates',  'TBA'),
  ('conference_venue',  'TBA'),
  -- contact + links
  ('contact_email',     ''),
  ('instagram_handle',  '@westmun_27'),
  ('instagram_url',     'https://www.instagram.com/westmun_27'),
  -- registration
  ('registration_open', 'false'),
  ('registration_currency', 'USD'),
  ('fee_early_bird',    ''),
  ('fee_regular',       ''),
  ('early_bird_opens',  ''),
  ('early_bird_closes', ''),
  ('regular_opens',     ''),
  ('regular_closes',    ''),
  -- page texts
  ('registration_intro',
   'Secure your delegation’s place at the Western Model United Nations Conference. Delegate registration proceeds in progressive windows. All official fee structures, financial aid criteria, and country allocation matrixes are To Be Announced (TBA).'),
  ('registration_notice_title', 'Official Delegate Registration Opening Soon'),
  ('registration_notice_text',
   'Official conference registration dates, delegate and delegation fee schedules, and committee allocation matrices will be published once conference dates and host venue agreements are ratified by the Secretariat.'),
  ('contact_intro',
   'Have questions regarding committee agendas, delegation quotas, or institutional sponsorships? Connect with the organizing team directly.'),
  -- legal
  ('organizer_name',  ''),
  ('legal_country',   ''),
  ('legal_version',   '2026-10-17'),
  ('terms_override',  ''),
  ('privacy_override', '')
on conflict (key) do nothing;


-- ---------------------------------------------------------------------
-- Secretariat
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.secretariat) then
    insert into public.secretariat (sort_order, role, name, department, bio, image_url, image_position, confirmed) values
      (1, 'Secretary-General', 'Rakan Almerbad', 'Executive Leadership',
       'Overseeing conference proceedings, guiding delegates, and maintaining parliamentary decorum. Dedicated to ensuring an exceptional, collaborative MUN experience for all delegations.',
       '/rakan-almerbad.jpg', 'center', true),
      (2, 'Deputy Secretary-General', 'Yousef Saifi', 'Executive Secretariat',
       'Experienced debater with a deep passion for global diplomacy and constructive dialogue. Committed to youth empowerment, collaborative problem-solving, and delivering an unforgettable conference.',
       '/yousef.jpg', 'top', true),
      (3, 'Under-Secretary-General', 'Fahad', 'Executive Secretariat',
       'Directing substantive committee operations, delegate services, and institutional logistics. Dedicated to fostering high-level multilateral debate and diplomatic excellence.',
       '/fahad.jpg', 'center', true),
      (4, 'Senior Advisor', 'Muaz Elamir', 'Advisory Board',
       'Hi im Muaz Elamir My job is to guide the team, share advice, and help make sure the conference runs smoothly so you all have a great MUN experience!',
       '/muaz.jpg', 'center', true);
  end if;
end $$;


-- ---------------------------------------------------------------------
-- Committees
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.committees) then
    insert into public.committees (sort_order, name, type, topic, chair, description, level) values
      (1, 'TBA', 'General Assembly',          'TBA', 'TBA', 'Official committee mandate, background guide, and historical setting will be published by the Secretariat upon confirmation.', 'Novice & Intermediate'),
      (2, 'TBA', 'Security Council',          'TBA', 'TBA', 'Official committee mandate, background guide, and historical setting will be published by the Secretariat upon confirmation.', 'Advanced & Crisis'),
      (3, 'TBA', 'Economic & Social Council', 'TBA', 'TBA', 'Official committee mandate, background guide, and historical setting will be published by the Secretariat upon confirmation.', 'Intermediate'),
      (4, 'TBA', 'Specialized Agency',        'TBA', 'TBA', 'Official committee mandate, background guide, and historical setting will be published by the Secretariat upon confirmation.', 'All Experience Levels'),
      (5, 'TBA', 'Crisis Committee',          'TBA', 'TBA', 'Official committee mandate, background guide, and historical setting will be published by the Secretariat upon confirmation.', 'Advanced / Dynamic Directives'),
      (6, 'TBA', 'Regional Body',             'TBA', 'TBA', 'Official committee mandate, background guide, and historical setting will be published by the Secretariat upon confirmation.', 'Intermediate');
  end if;
end $$;


-- ---------------------------------------------------------------------
-- Schedule (3 days, 3 sessions each)
-- ---------------------------------------------------------------------
do $$
declare
  d1 uuid := '5c1e0000-0000-4000-8000-000000000001';
  d2 uuid := '5c1e0000-0000-4000-8000-000000000002';
  d3 uuid := '5c1e0000-0000-4000-8000-000000000003';
begin
  if not exists (select 1 from public.schedule_days) then
    insert into public.schedule_days (id, sort_order, title, date_text) values
      (d1, 1, 'Day 1 — Convocations & Opening Deliberations', 'TBA'),
      (d2, 2, 'Day 2 — Intensive Negotiation & Working Papers', 'TBA'),
      (d3, 3, 'Day 3 — Voting Procedure & Closing Assembly', 'TBA');
  end if;

  if not exists (select 1 from public.schedule_sessions) and exists (select 1 from public.schedule_days where id = d1) then
    insert into public.schedule_sessions (day_id, sort_order, time_text, title, location, description) values
      (d1, 1, 'TBA', 'Delegate Accreditation & Registration', 'TBA', 'Official credential issuance, placard collection, and handbook verification for registered delegations and single delegates.'),
      (d1, 2, 'TBA', 'Opening Ceremony & Diplomatic Keynote Address', 'TBA', 'Secretariat welcome, introduction of committee dais teams, and opening remarks by invited international relations guest speakers.'),
      (d1, 3, 'TBA', 'Committee Session I: Roll Call & Agenda Adoption', 'TBA', 'Formal roll call of member states, setting the agenda, opening of the General Speakers List, and initial moderated caucuses.'),
      (d2, 1, 'TBA', 'Committee Session II: Substantive Debate', 'TBA', 'Deep debate on core agenda items. Introduction of unmoderated caucuses, formation of regional blocs, and drafting initial working papers.'),
      (d2, 2, 'TBA', 'Committee Session III: Crisis Directives & Working Papers', 'TBA', 'Dais review of submitted working papers. Introduction of crisis updates and real-time diplomatic intelligence scenarios.'),
      (d2, 3, 'TBA', 'Committee Session IV: Draft Resolution Formulation', 'TBA', 'Consolidation of competing working papers into formal draft resolutions with registered sponsor and signatory states.'),
      (d3, 1, 'TBA', 'Committee Session V: Amendments & Debate', 'TBA', 'Presentation of friendly and unfriendly amendments, final speeches for and against operative clauses, and bloc consolidation.'),
      (d3, 2, 'TBA', 'Formal Voting Procedure on Draft Resolutions', 'TBA', 'Strict roll call voting procedure in accordance with parliamentary rules. Adoption or rejection of final committee resolutions.'),
      (d3, 3, 'TBA', 'Closing Ceremony & Delegation Adjournment', 'TBA', 'Secretary-General closing address, committee awards presentation, gavel handover, and official adjournment of WEST MUN.');
  end if;
end $$;


-- ---------------------------------------------------------------------
-- FAQ
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.faq) then
    insert into public.faq (sort_order, question, answer) values
      (1, 'What is WEST MUN?',
       'WEST MUN (Western Model United Nations) is an academic conference simulating the United Nations and associated multilateral organs. Student delegates act as diplomats representing designated countries, researching international issues, negotiating policies, and authoring formal resolutions.'),
      (2, 'Who can participate?',
       'WEST MUN welcomes high school and university students with an interest in international relations, debate, politics, law, and diplomacy. Both individual delegates (independent registrations) and school delegations accompanied by faculty advisors are eligible to register.'),
      (3, 'Do I need previous MUN experience?',
       'No prior Model UN experience is required. The conference features committees tailored across skill levels, ranging from beginner-friendly General Assembly rooms with dais guidance to fast-paced advanced crisis simulations. Introductory procedure briefings are held during Day 1.'),
      (4, 'What should delegates prepare prior to the conference?',
       'Delegates should thoroughly study their committee’s official Background Guide, research their assigned nation’s foreign policy and treaty record, and prepare a written Position Paper. Delegates will also benefit from practicing speeches and familiarizing themselves with the Rules of Procedure.'),
      (5, 'What are the registration fees?',
       'Official registration fees for delegates, delegations, and faculty advisors are To Be Announced (TBA). The Secretariat is committed to keeping registration accessible and will announce final pricing alongside early-bird deadlines prior to open enrollment.'),
      (6, 'When and where will the conference take place?',
       'The official conference dates and host venue/city are To Be Announced (TBA). The Secretariat is finalizing agreements with partner educational facilities and will release the confirmed schedule on this website.'),
      (7, 'How can I contact the organizing team?',
       'Official secretariat contact email and communication channels are To Be Announced (TBA). In the interim, delegates and faculty may submit pre-registration alerts or message inquiries through our on-page Contact section below.');
  end if;
end $$;

-- Documents, sponsors and announcements start empty on purpose: those
-- sections stay hidden on the website until you add the first item.
