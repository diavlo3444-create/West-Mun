import React from 'react';
import { ArrowDownRight, ArrowUpRight, Compass, Globe2, Landmark } from 'lucide-react';
import { motion } from 'motion/react';
import { useInView } from '../hooks/useInView';

const JOURNEY = [
  {
    number: '01',
    eyebrow: 'DISCOVER',
    title: 'A world of perspectives.',
    description: 'Step beyond the headlines. Explore the global issues, nations, and competing perspectives that shape every committee.',
    action: 'Explore committees',
    href: '#committees',
    Icon: Globe2,
  },
  {
    number: '02',
    eyebrow: 'ENGAGE',
    title: 'Where ideas become action.',
    description: 'Enter the room, build alliances, challenge assumptions, and turn diplomatic debate into meaningful resolutions.',
    action: 'View the schedule',
    href: '#schedule',
    Icon: Landmark,
  },
  {
    number: '03',
    eyebrow: 'LEAVE A MARK',
    title: 'The work continues beyond the room.',
    description: 'Carry forward the confidence, perspective, and connections built through the WEST MUN experience.',
    action: 'Discover WEST MUN',
    href: '#about',
    Icon: Compass,
  },
];

export const ExperienceSection: React.FC = React.memo(() => {
  const { ref, isInView } = useInView<HTMLElement>({ threshold: 0.08 });

  return (
    <section id="experience" ref={ref} className="relative z-20 overflow-hidden border-t border-neutral-900 bg-[#080809] py-24 sm:py-32 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[30rem] w-[45rem] -translate-x-1/2 rounded-full bg-[#d4af37]/[0.045] blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(212,175,55,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.12) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'linear-gradient(to bottom, black, transparent 80%)' }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
          transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
          className="mb-14 sm:mb-20"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-10 bg-[#d4af37]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#d4af37]">Beyond the conference</span>
          </div>
          <div className="grid gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <h2 className="max-w-3xl font-serif text-4xl font-normal leading-[1.08] tracking-tight sm:text-6xl" style={{ fontFamily: 'var(--font-heading)' }}>
              More than a debate.
              <span className="gold-gradient-text block italic">A perspective that lasts.</span>
            </h2>
            <p className="max-w-xl text-sm font-light leading-7 text-neutral-400 sm:text-base">
              Every delegate arrives with a point of view. The WEST MUN experience challenges it, sharpens it, and turns conversation into something greater.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {JOURNEY.map(({ number, eyebrow, title, description, action, href, Icon }, index) => (
            <motion.article
              key={number}
              initial={{ opacity: 0, y: 34 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 34 }}
              transition={{ duration: 0.75, delay: 0.12 + index * 0.13, ease: [0.2, 0.7, 0.2, 1] }}
              whileHover={{ y: -7, transition: { duration: 0.25 } }}
              className="group relative flex min-h-[330px] flex-col overflow-hidden border border-neutral-800/90 bg-gradient-to-b from-[#111113] to-[#0a0a0c] p-7 sm:p-8"
            >
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-[#d4af37]/[0.07] blur-3xl transition-all duration-700 group-hover:bg-[#d4af37]/[0.15]" />
              <div className="relative mb-12 flex items-start justify-between">
                <span className="font-mono text-xs tracking-[0.2em] text-[#d4af37]">{number} / 03</span>
                <Icon className="h-6 w-6 text-neutral-500 transition-colors duration-300 group-hover:text-[#d4af37]" strokeWidth={1.25} />
              </div>
              <div className="relative">
                <p className="mb-3 text-[9px] font-semibold tracking-[0.28em] text-neutral-500">{eyebrow}</p>
                <h3 className="mb-4 max-w-xs font-serif text-2xl leading-tight text-white sm:text-[1.7rem]" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h3>
                <p className="max-w-sm text-sm font-light leading-6 text-neutral-400">{description}</p>
              </div>
              <a href={href} className="relative mt-auto inline-flex w-fit items-center gap-3 pt-9 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4af37] transition-colors hover:text-[#f3e5ab]">
                {action}
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
              </a>
              <span aria-hidden="true" className="absolute bottom-0 left-0 h-px w-0 bg-gradient-to-r from-[#d4af37] to-transparent transition-all duration-700 group-hover:w-full" />
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="mt-16 flex flex-col items-center justify-between gap-5 border-t border-neutral-800/80 pt-8 sm:flex-row"
        >
          <p className="font-serif text-lg text-neutral-300 sm:text-xl">The next chapter begins with you.</p>
          <a href="#register" className="inline-flex items-center gap-3 border border-[#d4af37]/60 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e7c75b] transition-all duration-300 hover:border-[#d4af37] hover:bg-[#d4af37] hover:text-black">
            Enter WEST MUN
            <ArrowDownRight className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
});

ExperienceSection.displayName = 'ExperienceSection';
