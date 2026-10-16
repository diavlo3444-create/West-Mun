import React from 'react';
import { Target, Award, Users2, Calendar, MapPin, Building } from 'lucide-react';
import { useInView } from '../hooks/useInView';

export const AboutSection: React.FC = React.memo(() => {
  const { ref, isInView } = useInView<HTMLElement>();

  return (
    <section id="about" ref={ref} className="relative z-20 py-24 sm:py-32 bg-[#070707] text-white border-t border-neutral-900">
      <div
        className={`max-w-7xl mx-auto px-5 sm:px-8 md:px-12 transition-all duration-1000 ease-out transform ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-[1px] bg-[#d4af37]" />
            <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
              Institutional Profile
            </span>
          </div>
          <h2
            className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight leading-tight mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            About{' '}
            <span className="gold-gradient-text shimmer-gold shimmer-stagger-3">
              WEST MUN
            </span>
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed font-light">
            WEST MUN is established to offer an uncompromising, academically rigorous platform for high school and collegiate delegates. We convene future diplomats to test their grasp of real-time crises, treaty obligations, and international negotiation.
          </p>
        </div>

        {/* 2-Column Split: Mission & Vision / Expectations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Mission & Vision */}
          <div className="space-y-8">
            <div className="p-8 bg-[#0c0c0e] border border-neutral-800 rounded-sm">
              <div className="flex items-center gap-3 mb-4 text-[#d4af37]">
                <Target className="w-5 h-5" />
                <h3 className="text-xl font-serif text-white">Mission & Vision</h3>
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                Our mission is to foster analytical critical thinking, cross-cultural empathy, and diplomatic discipline. WEST MUN empowers delegates to deconstruct complex international deadlocks and build durable coalitions through consensus.
              </p>
              <div className="p-4 bg-[#121215] border-l-2 border-[#d4af37] text-xs text-neutral-300">
                <span className="text-[#d4af37] font-semibold block mb-1">Official Conference Theme</span>
                TBA — The Secretariat will release the annual conference theme and comprehensive delegate handbook ahead of the registration deadline.
              </div>
            </div>

            <div className="p-8 bg-[#0c0c0e] border border-neutral-800 rounded-sm">
              <div className="flex items-center gap-3 mb-4 text-[#d4af37]">
                <Award className="w-5 h-5" />
                <h3 className="text-xl font-serif text-white">Why Participate?</h3>
              </div>
              <ul className="space-y-3 text-sm text-neutral-400">
                <li className="flex items-start gap-2.5">
                  <span className="text-[#d4af37] font-serif text-base">✦</span>
                  <span>Develop substantive fluency in international law, foreign policy, and treaty resolution drafting.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#d4af37] font-serif text-base">✦</span>
                  <span>Gain command of parliamentary procedure and high-stakes diplomatic rhetoric under pressure.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#d4af37] font-serif text-base">✦</span>
                  <span>Network with driven student delegates, faculty advisors, and guest speakers in international affairs.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* What Delegates Can Expect + Facts Sheet */}
          <div className="space-y-8">
            <div className="p-8 bg-[#0c0c0e] border border-neutral-800 rounded-sm">
              <div className="flex items-center gap-3 mb-4 text-[#d4af37]">
                <Users2 className="w-5 h-5" />
                <h3 className="text-xl font-serif text-white">What Delegates Can Expect</h3>
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                From opening plenary to final voting procedure, delegates will engage in rigorous committee sessions led by experienced dais members. Expect deep background research, dynamic crises updates, spirited debate, and collegiate social events.
              </p>

              {/* Conference Facts Table with Mandatory TBA policy */}
              <div className="border border-neutral-800 rounded-sm overflow-hidden">
                <div className="bg-[#141418] px-4 py-2.5 border-b border-neutral-800 text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
                  Conference Fact Sheet
                </div>
                <dl className="divide-y divide-neutral-800/80 text-xs">
                  <div className="px-4 py-3 flex justify-between items-center bg-[#09090b]">
                    <dt className="text-neutral-400 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Dates</span>
                    </dt>
                    <dd className="font-mono text-white font-medium">TBA</dd>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center bg-[#0e0e11]">
                    <dt className="text-neutral-400 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Venue / Host City</span>
                    </dt>
                    <dd className="font-mono text-white font-medium">TBA</dd>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center bg-[#09090b]">
                    <dt className="text-neutral-400 flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Host Institution</span>
                    </dt>
                    <dd className="font-mono text-white font-medium">TBA</dd>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center bg-[#0e0e11]">
                    <dt className="text-neutral-400 flex items-center gap-2">
                      <Users2 className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Target Delegation</span>
                    </dt>
                    <dd className="font-mono text-white font-medium">High School & University</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
AboutSection.displayName = 'AboutSection';
