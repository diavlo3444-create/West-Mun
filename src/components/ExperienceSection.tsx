import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const JOURNEY = [
  {
    number: '01',
    title: 'Before the debate',
    description: 'Research the committee, understand the agenda, and arrive ready to defend a position.',
    action: 'Explore committees',
    href: '#committees',
  },
  {
    number: '02',
    title: 'In the room',
    description: 'Question, negotiate, build alliances, and work towards a resolution with other delegates.',
    action: 'View the schedule',
    href: '#schedule',
  },
  {
    number: '03',
    title: 'What stays with you',
    description: 'New perspectives, sharper arguments, and connections that extend beyond the conference.',
    action: 'About WEST MUN',
    href: '#about',
  },
];

export const ExperienceSection: React.FC = React.memo(() => (
  <section id="experience" className="relative z-20 border-t border-neutral-800 bg-[#090909] py-24 sm:py-32 text-white">
    <div className="mx-auto max-w-6xl px-5 sm:px-8 md:px-12">
      <div className="mb-16 grid gap-8 border-b border-neutral-800 pb-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
        <div>
          <p className="mb-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-[#c5a059]">
            <span className="h-px w-8 bg-[#c5a059]" />
            The WEST MUN experience
          </p>
          <h2 className="max-w-2xl text-4xl font-normal leading-[1.12] tracking-tight sm:text-6xl" style={{ fontFamily: 'var(--font-heading)' }}>
            It doesn't end when the committee does.
          </h2>
        </div>
        <p className="max-w-md text-sm leading-7 text-neutral-400 md:justify-self-end">
          A conference is built from the people in the room: the questions they ask, the positions they challenge, and the work they do together.
        </p>
      </div>

      <div>
        {JOURNEY.map((item) => (
          <article key={item.number} className="group grid gap-5 border-b border-neutral-800 py-8 transition-colors hover:border-[#c5a059]/60 md:grid-cols-[90px_1fr_1fr_170px] md:items-center">
            <span className="font-mono text-xs text-[#c5a059]">{item.number}</span>
            <h3 className="text-2xl font-normal tracking-tight sm:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>{item.title}</h3>
            <p className="max-w-md text-sm leading-6 text-neutral-400">{item.description}</p>
            <a href={item.href} className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c5a059] transition-colors hover:text-[#f3e5ab]">
              {item.action}
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </article>
        ))}
      </div>

      <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg text-neutral-300" style={{ fontFamily: 'var(--font-serif)' }}>Applications and conference information</p>
        <a href="#register" className="inline-flex w-fit items-center gap-3 border border-[#c5a059] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d6b96b] transition-colors hover:bg-[#c5a059] hover:text-black">
          Registration details <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  </section>
));

ExperienceSection.displayName = 'ExperienceSection';
